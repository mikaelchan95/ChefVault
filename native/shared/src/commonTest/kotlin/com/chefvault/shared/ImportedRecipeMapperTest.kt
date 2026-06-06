package com.chefvault.shared

import com.chefvault.shared.data.remote.mapImportedRecipeJson
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ImportedRecipeMapperTest {
    @Test
    fun mapsValidParserResponseToDraft() {
        val json = """
            {
              "title": "Tomato Pasta",
              "cuisine": "Italian",
              "servings": 4,
              "prep_time": 10,
              "cook_time": 15,
              "description": "Fast service pasta.",
              "ingredients": [
                { "name": "Pasta", "quantity": 400, "unit": "g", "notes": null },
                { "name": "Tomatoes", "quantity": 500, "unit": "g", "notes": "crushed" }
              ],
              "steps": [
                { "instruction": "Boil pasta.", "timer_seconds": 600 },
                { "instruction": "Toss with tomatoes.", "timer_seconds": null }
              ],
              "warnings": ["Created from voice - please check quantities and steps."]
            }
        """.trimIndent()

        val result = mapImportedRecipeJson(json, fallbackSourceUrl = null)

        assertEquals("Tomato Pasta", result.recipe.title)
        assertEquals("Italian", result.recipe.cuisine)
        assertEquals(4, result.recipe.servings)
        assertEquals(2, result.recipe.ingredients.size)
        assertEquals("crushed", result.recipe.ingredients[1].notes)
        assertEquals(600, result.recipe.steps[0].timerSeconds)
        assertEquals("Created from voice - please check quantities and steps.", result.warnings.single())
    }

    @Test
    fun rejectsBlankDrafts() {
        val json = """{"title":"","ingredients":[],"steps":[],"warnings":[]}"""

        assertFailsWith<IllegalArgumentException> {
            mapImportedRecipeJson(json, fallbackSourceUrl = null)
        }
    }
}
