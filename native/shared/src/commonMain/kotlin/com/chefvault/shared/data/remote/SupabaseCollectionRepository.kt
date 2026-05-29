package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.CollectionRepository
import com.chefvault.shared.data.repository.NewCollection
import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

/** Collection membership is stored in the `collection_recipes` join table (collection_id, recipe_id). */
@Serializable
internal data class CollectionRecipeRef(val recipeId: String)

@Serializable
internal data class CollectionRow(
    val id: String,
    val userId: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val status: String = "active",
    val createdAt: String = "",
    val updatedAt: String = "",
    val collectionRecipes: List<CollectionRecipeRef> = emptyList(),
)

@Serializable
internal data class CollectionInsert(
    val userId: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val status: String,
)

@Serializable
internal data class CollectionUpdate(
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val status: String,
)

@Serializable
internal data class CollectionRecipeInsert(val collectionId: String, val recipeId: String)

internal fun statusToString(status: CollectionStatus): String =
    if (status == CollectionStatus.DRAFT) "draft" else "active"

internal fun CollectionRow.toDomain(): Collection = Collection(
    id = id,
    userId = userId,
    name = name,
    description = description,
    color = color,
    icon = icon,
    status = if (status == "draft") CollectionStatus.DRAFT else CollectionStatus.ACTIVE,
    recipeIds = collectionRecipes.map { it.recipeId },
    createdAt = createdAt,
    updatedAt = updatedAt,
)

class SupabaseCollectionRepository(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
) : CollectionRepository {

    private val _collections = MutableStateFlow<List<Collection>>(emptyList())
    override val collections: StateFlow<List<Collection>> = _collections.asStateFlow()

    override suspend fun refresh() {
        val uid = auth.currentUserId() ?: return
        val rows = client.from("collections")
            .select(Columns.raw("*, collection_recipes(recipe_id)")) {
                filter { eq("user_id", uid) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<CollectionRow>()
        _collections.value = rows.map { it.toDomain() }
    }

    override suspend fun create(form: NewCollection): Collection {
        val uid = auth.currentUserId() ?: error("Not authenticated")
        val row = client.from("collections")
            .insert(
                CollectionInsert(
                    userId = uid,
                    name = form.name,
                    description = form.description,
                    color = form.color,
                    icon = form.icon,
                    status = statusToString(form.status),
                ),
            ) { select() }
            .decodeSingle<CollectionRow>()
        val collection = row.toDomain()
        _collections.value = listOf(collection) + _collections.value
        return collection
    }

    override suspend fun update(id: String, form: NewCollection) {
        client.from("collections")
            .update(
                CollectionUpdate(
                    name = form.name,
                    description = form.description,
                    color = form.color,
                    icon = form.icon,
                    status = statusToString(form.status),
                ),
            ) { filter { eq("id", id) } }
        _collections.value = _collections.value.map {
            if (it.id == id) {
                it.copy(
                    name = form.name,
                    description = form.description,
                    color = form.color,
                    icon = form.icon,
                    status = form.status,
                )
            } else {
                it
            }
        }
    }

    override suspend fun delete(id: String) {
        val previous = _collections.value
        _collections.value = previous.filterNot { it.id == id } // optimistic
        try {
            client.from("collections").delete { filter { eq("id", id) } }
        } catch (e: Exception) {
            _collections.value = previous
            throw e
        }
    }

    override suspend fun addRecipe(collectionId: String, recipeId: String) {
        val previous = _collections.value
        _collections.value = previous.map {
            if (it.id == collectionId && recipeId !in it.recipeIds) {
                it.copy(recipeIds = it.recipeIds + recipeId)
            } else {
                it
            }
        }
        try {
            client.from("collection_recipes")
                .insert(CollectionRecipeInsert(collectionId = collectionId, recipeId = recipeId))
        } catch (e: Exception) {
            _collections.value = previous
            throw e
        }
    }

    override suspend fun removeRecipe(collectionId: String, recipeId: String) {
        val previous = _collections.value
        _collections.value = previous.map {
            if (it.id == collectionId) it.copy(recipeIds = it.recipeIds.filterNot { rid -> rid == recipeId }) else it
        }
        try {
            client.from("collection_recipes").delete {
                filter {
                    eq("collection_id", collectionId)
                    eq("recipe_id", recipeId)
                }
            }
        } catch (e: Exception) {
            _collections.value = previous
            throw e
        }
    }
}
