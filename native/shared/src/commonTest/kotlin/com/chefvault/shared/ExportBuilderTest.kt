package com.chefvault.shared

import com.chefvault.shared.export.ExportBuilder
import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import com.chefvault.shared.model.PrepItem
import com.chefvault.shared.model.PrepList
import com.chefvault.shared.model.PrepListStatus
import com.chefvault.shared.model.Recipe
import com.chefvault.shared.model.Step
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class ExportBuilderTest {
    private val recipe = Recipe(
        id = "r1",
        userId = "u1",
        title = "Test Cake",
        cuisine = "Pastry",
        servings = 8,
        createdAt = "2026-01-01",
        updatedAt = "2026-01-02",
        ingredients = listOf(ing("Flour", 500.0, "g", cost = 0.002)),
        steps = listOf(Step(stepNumber = 1, instruction = "Mix")),
    )
    private val collection = Collection(
        id = "c1", userId = "u1", name = "Desserts", status = CollectionStatus.DRAFT,
        recipeIds = listOf("r1"), createdAt = "x", updatedAt = "y",
    )
    private val prepList = PrepList(
        id = "p1", name = "Saturday", date = "2026-01-03", status = PrepListStatus.COMPLETED,
        recipeIds = listOf("r1"),
        items = listOf(PrepItem(id = "i1", name = "Flour", quantity = 500.0, unit = "g", station = "Dry Goods", checked = true)),
        createdAt = "x", updatedAt = "y",
    )

    @Test
    fun buildsExpectedStructure() {
        val out = ExportBuilder.build(
            recipes = listOf(recipe),
            collections = listOf(collection),
            prepLists = listOf(prepList),
            profile = null,
            exportedAt = "2026-05-30T00:00:00Z",
        )
        val root = Json.parseToJsonElement(out) as JsonObject

        assertEquals("1.0", root["version"]!!.jsonPrimitive.content)
        assertEquals("2026-05-30T00:00:00Z", root["exported_at"]!!.jsonPrimitive.content)

        val r = root["recipes"]!!.jsonArray[0].jsonObject
        assertEquals("Test Cake", r["title"]!!.jsonPrimitive.content)
        assertEquals(8, r["servings"]!!.jsonPrimitive.content.toInt())
        assertEquals("Flour", r["ingredients"]!!.jsonArray[0].jsonObject["name"]!!.jsonPrimitive.content)
        assertEquals("Mix", r["steps"]!!.jsonArray[0].jsonObject["instruction"]!!.jsonPrimitive.content)

        val c = root["collections"]!!.jsonArray[0].jsonObject
        assertEquals("draft", c["status"]!!.jsonPrimitive.content)
        assertEquals("r1", c["recipe_ids"]!!.jsonArray[0].jsonPrimitive.content)

        val pl = root["prep_lists"]!!.jsonArray[0].jsonObject
        assertEquals("completed", pl["status"]!!.jsonPrimitive.content)
        assertEquals(true, pl["items"]!!.jsonArray[0].jsonObject["checked"]!!.jsonPrimitive.content.toBoolean())
    }
}
