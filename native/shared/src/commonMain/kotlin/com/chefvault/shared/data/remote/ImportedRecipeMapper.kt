package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.ImportedRecipe
import com.chefvault.shared.data.repository.NewIngredient
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.NewStep
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

@Serializable
data class ImportErrorDto(
    val error: String? = null,
    val warnings: List<String> = emptyList(),
)

@Serializable
private data class ImportedIngredientDto(
    val name: String,
    val quantity: Double = 1.0,
    val unit: String = "",
    val notes: String? = null,
)

@Serializable
private data class ImportedStepDto(
    val instruction: String,
    val timerSeconds: Int? = null,
)

@Serializable
private data class ImportResponseDto(
    val title: String = "",
    val cuisine: String? = null,
    val servings: Int = 1,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val sourceUrl: String? = null,
    val ingredients: List<ImportedIngredientDto> = emptyList(),
    val steps: List<ImportedStepDto> = emptyList(),
    val warnings: List<String> = emptyList(),
)

@OptIn(ExperimentalSerializationApi::class)
val importJson: Json = Json {
    namingStrategy = JsonNamingStrategy.SnakeCase
    ignoreUnknownKeys = true
}

fun mapImportedRecipeJson(text: String, fallbackSourceUrl: String?): ImportedRecipe {
    val dto = importJson.decodeFromString<ImportResponseDto>(text)
    val imageUrl = dto.imageUrl?.trim()?.ifEmpty { null }
    val ingredients = dto.ingredients
        .filter { it.name.isNotBlank() }
        .map { NewIngredient(it.name.trim(), it.quantity, it.unit.trim(), it.notes?.trim()?.ifEmpty { null }) }
    val steps = dto.steps
        .filter { it.instruction.isNotBlank() }
        .map { NewStep(it.instruction.trim(), it.timerSeconds) }

    require(ingredients.isNotEmpty() || steps.isNotEmpty()) {
        "Couldn't extract a recipe draft."
    }

    return ImportedRecipe(
        recipe = NewRecipe(
            title = dto.title.trim().ifEmpty { "Imported recipe" },
            cuisine = dto.cuisine?.trim()?.ifEmpty { null },
            servings = dto.servings.coerceAtLeast(1),
            prepTime = dto.prepTime,
            cookTime = dto.cookTime,
            description = dto.description?.trim()?.ifEmpty { null },
            imageUrl = imageUrl,
            platingPhotos = listOfNotNull(imageUrl),
            sourceUrl = dto.sourceUrl?.trim()?.ifEmpty { null } ?: fallbackSourceUrl,
            ingredients = ingredients,
            steps = steps,
        ),
        warnings = dto.warnings,
    )
}
