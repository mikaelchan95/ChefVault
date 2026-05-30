package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.RecipeRepository
import com.chefvault.shared.model.Recipe
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

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
                ),
            ) { select() }
            .decodeSingle<RecipeRow>()

        val recipeId = inserted.id
        insertIngredientsAndSteps(recipeId, form)

        refresh()
        return _recipes.value.firstOrNull { it.id == recipeId } ?: inserted.toDomain()
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
