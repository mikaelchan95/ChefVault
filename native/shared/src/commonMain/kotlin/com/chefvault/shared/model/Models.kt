package com.chefvault.shared.model

/** Measurement system used by the scaling engine and the user's unit preference. */
enum class MeasurementSystem { METRIC, IMPERIAL }

enum class Plan { FREE, PRO }

enum class CollectionStatus { ACTIVE, DRAFT }

enum class PrepListStatus { ACTIVE, COMPLETED }

enum class PrepItemStatus { PENDING, IN_PROGRESS, COMPLETED }

/**
 * Domain models — faithful port of `src/types/index.ts`. `val`-only so they bridge to
 * Swift as immutable `Sendable` value types. `@Serializable` is added in the data-layer
 * phase (P4) together with the kotlinx-serialization plugin.
 */
data class Ingredient(
    val id: String = "",
    val recipeId: String = "",
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val costPerUnit: Double? = null,
    val sortOrder: Int = 0,
)

data class Step(
    val id: String = "",
    val recipeId: String = "",
    val stepNumber: Int,
    val instruction: String,
    val timerSeconds: Int? = null,
)

data class Recipe(
    val id: String,
    val userId: String,
    val title: String,
    val cuisine: String? = null,
    val servings: Int,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val platingPhotos: List<String> = emptyList(),
    val sourceUrl: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val ingredients: List<Ingredient> = emptyList(),
    val steps: List<Step> = emptyList(),
)

data class Collection(
    val id: String,
    val userId: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val status: CollectionStatus = CollectionStatus.ACTIVE,
    val recipeIds: List<String> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
)

data class PrepItem(
    val id: String,
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val station: String,
    val checked: Boolean = false,
)

data class PrepList(
    val id: String,
    val name: String,
    val date: String,
    val status: PrepListStatus = PrepListStatus.ACTIVE,
    val recipeIds: List<String> = emptyList(),
    val items: List<PrepItem> = emptyList(),
    val createdAt: String,
    val updatedAt: String,
)

data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val title: String? = null,
    val avatarUrl: String? = null,
    val plan: Plan = Plan.FREE,
    val defaultUnits: MeasurementSystem = MeasurementSystem.METRIC,
    val language: String = "en",
    val autoBackup: Boolean = true,
)

/** Result of aggregating ingredients across recipes for a prep list. */
data class AggregatedIngredient(
    val name: String,
    val quantity: Double,
    val unit: String,
)

/** UI picker constants — port of UNITS / CUISINES in `src/types/index.ts`. */
val UNITS: List<String> = listOf("g", "kg", "ml", "L", "pc", "tbsp", "tsp", "cup", "oz", "lb")

val CUISINES: List<String> = listOf(
    "French", "Italian", "Japanese", "Asian", "American",
    "Mexican", "Indian", "Mediterranean", "Fusion", "Pastry", "Other",
)
