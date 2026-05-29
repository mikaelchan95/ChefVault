package com.chefvault.shared.export

import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.PrepList
import com.chefvault.shared.model.PrepListStatus
import com.chefvault.shared.model.Recipe
import com.chefvault.shared.model.UserProfile
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray

/**
 * Builds the JSON export payload — a faithful port of `src/lib/export.ts`. Pure: the
 * platform supplies [exportedAt] (ISO-8601) and writes/shares the returned string.
 */
object ExportBuilder {
    private val json = Json { prettyPrint = true }

    fun build(
        recipes: List<Recipe>,
        collections: List<Collection>,
        prepLists: List<PrepList>,
        profile: UserProfile?,
        exportedAt: String,
    ): String {
        val root = buildJsonObject {
            put("version", "1.0")
            put("exported_at", exportedAt)
            if (profile != null) {
                put(
                    "profile",
                    buildJsonObject {
                        put("name", profile.name)
                        put("title", profile.title)
                        put("default_units", if (profile.defaultUnits == MeasurementSystem.IMPERIAL) "imperial" else "metric")
                        put("language", profile.language)
                    },
                )
            } else {
                put("profile", null as String?)
            }
            putJsonArray("recipes") {
                recipes.forEach { r ->
                    addJsonObject {
                        put("title", r.title)
                        put("cuisine", r.cuisine)
                        put("servings", r.servings)
                        put("prep_time", r.prepTime)
                        put("cook_time", r.cookTime)
                        put("description", r.description)
                        put("image_url", r.imageUrl)
                        putJsonArray("plating_photos") { r.platingPhotos.forEach { add(it) } }
                        putJsonArray("ingredients") {
                            r.ingredients.forEach { i ->
                                addJsonObject {
                                    put("name", i.name)
                                    put("quantity", i.quantity)
                                    put("unit", i.unit)
                                    put("notes", i.notes)
                                    put("cost_per_unit", i.costPerUnit)
                                    put("sort_order", i.sortOrder)
                                }
                            }
                        }
                        putJsonArray("steps") {
                            r.steps.forEach { s ->
                                addJsonObject {
                                    put("step_number", s.stepNumber)
                                    put("instruction", s.instruction)
                                    put("timer_seconds", s.timerSeconds)
                                }
                            }
                        }
                    }
                }
            }
            putJsonArray("collections") {
                collections.forEach { c ->
                    addJsonObject {
                        put("name", c.name)
                        put("description", c.description)
                        put("color", c.color)
                        put("icon", c.icon)
                        put("status", if (c.status == CollectionStatus.DRAFT) "draft" else "active")
                        putJsonArray("recipe_ids") { c.recipeIds.forEach { add(it) } }
                    }
                }
            }
            putJsonArray("prep_lists") {
                prepLists.forEach { pl ->
                    addJsonObject {
                        put("name", pl.name)
                        put("date", pl.date)
                        put("status", if (pl.status == PrepListStatus.COMPLETED) "completed" else "active")
                        putJsonArray("items") {
                            pl.items.forEach { i ->
                                addJsonObject {
                                    put("name", i.name)
                                    put("quantity", i.quantity)
                                    put("unit", i.unit)
                                    put("notes", i.notes)
                                    put("station", i.station)
                                    put("checked", i.checked)
                                }
                            }
                        }
                    }
                }
            }
        }
        return json.encodeToString(kotlinx.serialization.json.JsonObject.serializer(), root)
    }
}
