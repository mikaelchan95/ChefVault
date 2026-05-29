package com.chefvault.shared.data.remote

import com.chefvault.shared.model.Ingredient
import com.chefvault.shared.model.Recipe
import com.chefvault.shared.model.Step
import kotlinx.serialization.Serializable

/**
 * Supabase row + insert DTOs. Field names are camelCase; the Supabase client's Json is
 * configured with [kotlinx.serialization.json.JsonNamingStrategy.SnakeCase], so they map
 * to the snake_case Postgres columns automatically. Kept separate from domain models so
 * serialization concerns never leak into the pure domain layer.
 */

@Serializable
data class IngredientRow(
    val id: String,
    val recipeId: String = "",
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val costPerUnit: Double? = null,
    val sortOrder: Int = 0,
)

@Serializable
data class StepRow(
    val id: String,
    val recipeId: String = "",
    val stepNumber: Int,
    val instruction: String,
    val timerSeconds: Int? = null,
)

@Serializable
data class RecipeRow(
    val id: String,
    val userId: String,
    val title: String,
    val cuisine: String? = null,
    val servings: Double = 1.0,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val platingPhotos: List<String> = emptyList(),
    val createdAt: String = "",
    val updatedAt: String = "",
    val ingredients: List<IngredientRow> = emptyList(),
    val steps: List<StepRow> = emptyList(),
)

@Serializable
data class RecipeInsert(
    val userId: String,
    val title: String,
    val cuisine: String? = null,
    val servings: Int,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val platingPhotos: List<String> = emptyList(),
)

@Serializable
data class RecipeUpdate(
    val title: String,
    val cuisine: String? = null,
    val servings: Int,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
)

@Serializable
data class IngredientInsert(
    val recipeId: String,
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val costPerUnit: Double? = null,
    val sortOrder: Int = 0,
)

@Serializable
data class StepInsert(
    val recipeId: String,
    val stepNumber: Int,
    val instruction: String,
    val timerSeconds: Int? = null,
)

fun IngredientRow.toDomain(): Ingredient = Ingredient(
    id = id,
    recipeId = recipeId,
    name = name,
    quantity = quantity,
    unit = unit,
    notes = notes,
    costPerUnit = costPerUnit,
    sortOrder = sortOrder,
)

fun StepRow.toDomain(): Step = Step(
    id = id,
    recipeId = recipeId,
    stepNumber = stepNumber,
    instruction = instruction,
    timerSeconds = timerSeconds,
)

fun RecipeRow.toDomain(): Recipe = Recipe(
    id = id,
    userId = userId,
    title = title,
    cuisine = cuisine,
    servings = servings.toInt(),
    prepTime = prepTime,
    cookTime = cookTime,
    description = description,
    imageUrl = imageUrl,
    platingPhotos = platingPhotos,
    createdAt = createdAt,
    updatedAt = updatedAt,
    ingredients = ingredients.sortedBy { it.sortOrder }.map { it.toDomain() },
    steps = steps.sortedBy { it.stepNumber }.map { it.toDomain() },
)
