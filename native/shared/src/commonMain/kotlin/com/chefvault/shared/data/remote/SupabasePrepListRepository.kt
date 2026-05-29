package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.PrepListRepository
import com.chefvault.shared.data.repository.RecipeRepository
import com.chefvault.shared.model.PrepItem
import com.chefvault.shared.model.PrepList
import com.chefvault.shared.model.PrepListStatus
import com.chefvault.shared.preplist.Stations
import com.chefvault.shared.scaling.aggregateIngredients
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

@Serializable
internal data class PrepItemRow(
    val id: String,
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val station: String,
    val checked: Boolean = false,
)

@Serializable
internal data class PrepListRow(
    val id: String,
    val userId: String,
    val name: String,
    val date: String,
    val status: String = "active",
    val recipeIds: List<String> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String = "",
    val prepItems: List<PrepItemRow> = emptyList(),
)

@Serializable
internal data class PrepListInsert(
    val userId: String,
    val name: String,
    val date: String,
    val status: String,
    val recipeIds: List<String>,
)

@Serializable
internal data class PrepItemInsert(
    val prepListId: String,
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val station: String,
    val checked: Boolean,
)

@Serializable
internal data class PrepItemCheckedUpdate(val checked: Boolean)

internal fun PrepItemRow.toDomain(): PrepItem =
    PrepItem(id = id, name = name, quantity = quantity, unit = unit, notes = notes, station = station, checked = checked)

internal fun PrepListRow.toDomain(): PrepList = PrepList(
    id = id,
    name = name,
    date = date,
    status = if (status == "completed") PrepListStatus.COMPLETED else PrepListStatus.ACTIVE,
    recipeIds = recipeIds,
    items = prepItems.map { it.toDomain() },
    createdAt = createdAt,
    updatedAt = updatedAt,
)

class SupabasePrepListRepository(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
    private val recipes: RecipeRepository,
) : PrepListRepository {

    private val _prepLists = MutableStateFlow<List<PrepList>>(emptyList())
    override val prepLists: StateFlow<List<PrepList>> = _prepLists.asStateFlow()

    override suspend fun refresh() {
        val uid = auth.currentUserId() ?: return
        val rows = client.from("prep_lists")
            .select(Columns.raw("*, prep_items(*)")) {
                filter { eq("user_id", uid) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<PrepListRow>()
        _prepLists.value = rows.map { it.toDomain() }
    }

    override suspend fun createFromRecipes(name: String, date: String, recipeIds: List<String>): PrepList {
        val uid = auth.currentUserId() ?: error("Not authenticated")

        val selected = recipes.recipes.value.filter { it.id in recipeIds }
        val aggregated = aggregateIngredients(selected.flatMap { it.ingredients })

        val listRow = client.from("prep_lists")
            .insert(
                PrepListInsert(userId = uid, name = name, date = date, status = "active", recipeIds = recipeIds),
            ) { select() }
            .decodeSingle<PrepListRow>()

        val items = if (aggregated.isNotEmpty()) {
            val inserts = aggregated.map { agg ->
                PrepItemInsert(
                    prepListId = listRow.id,
                    name = agg.name.replaceFirstChar { it.uppercase() },
                    quantity = agg.quantity,
                    unit = agg.unit,
                    notes = null,
                    station = Stations.assign(agg.name),
                    checked = false,
                )
            }
            client.from("prep_items").insert(inserts) { select() }.decodeList<PrepItemRow>().map { it.toDomain() }
        } else {
            emptyList()
        }

        val prepList = listRow.toDomain().copy(items = items)
        _prepLists.value = listOf(prepList) + _prepLists.value
        return prepList
    }

    override suspend fun toggleItem(listId: String, itemId: String) {
        val previous = _prepLists.value
        var newChecked = false
        _prepLists.value = previous.map { list ->
            if (list.id != listId) {
                list
            } else {
                list.copy(
                    items = list.items.map { item ->
                        if (item.id == itemId) {
                            newChecked = !item.checked
                            item.copy(checked = newChecked)
                        } else {
                            item
                        }
                    },
                )
            }
        }
        try {
            client.from("prep_items").update(PrepItemCheckedUpdate(newChecked)) { filter { eq("id", itemId) } }
        } catch (e: Exception) {
            _prepLists.value = previous
            throw e
        }
    }

    override suspend fun delete(id: String) {
        val previous = _prepLists.value
        _prepLists.value = previous.filterNot { it.id == id } // optimistic
        try {
            client.from("prep_lists").delete { filter { eq("id", id) } }
        } catch (e: Exception) {
            _prepLists.value = previous
            throw e
        }
    }
}
