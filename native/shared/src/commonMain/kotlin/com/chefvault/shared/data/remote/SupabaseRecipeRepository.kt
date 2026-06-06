package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.ImportedRecipe
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.RecipeRepository
import com.chefvault.shared.model.Recipe
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.ktor.client.call.body
import io.ktor.client.plugins.timeout
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

class SupabaseRecipeRepository(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
    @Suppress("unused") private val scope: CoroutineScope,
) : RecipeRepository {

    private val _recipes = MutableStateFlow<List<Recipe>>(emptyList())
    override val recipes: StateFlow<List<Recipe>> = _recipes.asStateFlow()

    override suspend fun refresh() {
        val uid = auth.currentUserId() ?: return
        val rows = client.from("recipes")
            .select(Columns.raw("*, ingredients(*), steps(*)")) {
                filter { eq("user_id", uid) }
                order("updated_at", Order.DESCENDING)
            }
            .decodeList<RecipeRow>()
        _recipes.value = rows.map { it.toDomain() }
    }

    override suspend fun addRecipe(form: NewRecipe): Recipe {
        val uid = auth.currentUserId() ?: error("Not authenticated")

        // The server-side check_recipe_limit() trigger enforces the free-plan cap; any
        // PostgrestRestException it raises surfaces to the caller to map to a user message.
        val inserted = client.from("recipes")
            .insert(
                RecipeInsert(
                    userId = uid,
                    title = form.title,
                    cuisine = form.cuisine,
                    servings = form.servings,
                    prepTime = form.prepTime,
                    cookTime = form.cookTime,
                    description = form.description,
                    imageUrl = form.imageUrl,
                    platingPhotos = form.platingPhotos,
                    sourceUrl = form.sourceUrl,
                ),
            ) { select() }
            .decodeSingle<RecipeRow>()

        val recipeId = inserted.id
        insertIngredientsAndSteps(recipeId, form)

        refresh()
        return _recipes.value.firstOrNull { it.id == recipeId } ?: inserted.toDomain()
    }

    override suspend fun importFromUrl(url: String): ImportedRecipe {
        // Calls the `import-recipe` edge function (verify_jwt=true → the user's JWT is
        // attached automatically). Returns a draft to review; nothing is saved here.
        val response = client.functions.invoke("import-recipe") {
            // The Functions client has no Ktor ContentNegotiation, so setBody(object)/body<T>()
            // can't (de)serialize. Send a JSON String + header, and decode the response by hand.
            setBody(importJson.encodeToString(ImportRequest(url)))
            contentType(ContentType.Application.Json)
            // Watching a video can take a while; the default 10s client timeout is far too short.
            timeout {
                requestTimeoutMillis = 180_000
                socketTimeoutMillis = 180_000
            }
        }
        val text = response.body<String>()
        if (!response.status.isSuccess()) {
            val err = runCatching { importJson.decodeFromString<ImportErrorDto>(text) }.getOrNull()
            throw Exception(err?.error ?: "Couldn't read a recipe from that link.")
        }
        return mapImportedRecipeJson(text, fallbackSourceUrl = url)
    }

    override suspend fun createDraftFromText(text: String): ImportedRecipe {
        val cleaned = text.trim()
        require(cleaned.length >= 24) { "Say a little more so ChefVault can build a recipe draft." }
        val response = client.functions.invoke("parse-recipe-text") {
            setBody(importJson.encodeToString(TextImportRequest(cleaned)))
            contentType(ContentType.Application.Json)
            timeout {
                requestTimeoutMillis = 90_000
                socketTimeoutMillis = 90_000
            }
        }
        val bodyText = response.body<String>()
        if (!response.status.isSuccess()) {
            val err = runCatching { importJson.decodeFromString<ImportErrorDto>(bodyText) }.getOrNull()
            throw Exception(err?.error ?: "Couldn't create a recipe from that transcript.")
        }
        return mapImportedRecipeJson(bodyText, fallbackSourceUrl = null)
    }

    override suspend fun update(id: String, form: NewRecipe) {
        client.from("recipes")
            .update(
                RecipeUpdate(
                    title = form.title,
                    cuisine = form.cuisine,
                    servings = form.servings,
                    prepTime = form.prepTime,
                    cookTime = form.cookTime,
                    description = form.description,
                    imageUrl = form.imageUrl,
                    platingPhotos = form.platingPhotos,
                    sourceUrl = form.sourceUrl,
                ),
            ) { filter { eq("id", id) } }

        // Ingredients and steps are replaced wholesale (mirrors recipeStore.updateRecipe).
        client.from("ingredients").delete { filter { eq("recipe_id", id) } }
        client.from("steps").delete { filter { eq("recipe_id", id) } }
        insertIngredientsAndSteps(id, form)

        refresh()
    }

    /** Inserts a recipe's ingredients and steps, preserving order via sort_order/step_number. */
    private suspend fun insertIngredientsAndSteps(recipeId: String, form: NewRecipe) {
        if (form.ingredients.isNotEmpty()) {
            client.from("ingredients").insert(
                form.ingredients.mapIndexed { index, ing ->
                    IngredientInsert(
                        recipeId = recipeId,
                        name = ing.name,
                        quantity = ing.quantity,
                        unit = ing.unit,
                        notes = ing.notes,
                        costPerUnit = ing.costPerUnit,
                        sortOrder = index,
                    )
                },
            )
        }
        if (form.steps.isNotEmpty()) {
            client.from("steps").insert(
                form.steps.mapIndexed { index, step ->
                    StepInsert(
                        recipeId = recipeId,
                        stepNumber = index + 1,
                        instruction = step.instruction,
                        timerSeconds = step.timerSeconds,
                    )
                },
            )
        }
    }

    override suspend fun delete(id: String) {
        val previous = _recipes.value
        _recipes.value = previous.filterNot { it.id == id } // optimistic
        try {
            client.from("recipes").delete { filter { eq("id", id) } }
        } catch (e: Exception) {
            _recipes.value = previous // rollback
            throw e
        }
    }

    override suspend fun deleteMany(ids: List<String>) {
        if (ids.isEmpty()) return
        val previous = _recipes.value
        val idSet = ids.toSet()
        _recipes.value = previous.filterNot { it.id in idSet } // optimistic
        try {
            client.from("recipes").delete { filter { isIn("id", ids) } }
        } catch (e: Exception) {
            _recipes.value = previous // rollback
            throw e
        }
    }
}

// --- import-recipe edge function wire DTOs (snake_case via the client's Json strategy) ---

@Serializable
private data class ImportRequest(val url: String)

@Serializable
private data class TextImportRequest(val text: String)
