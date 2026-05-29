package com.chefvault.shared.data.repository

import com.chefvault.shared.model.Recipe
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/** Auth state exposed to the UI. Sealed so SKIE maps it to an exhaustive Swift enum. */
sealed class AuthState {
    data object Loading : AuthState()
    data object NotAuthenticated : AuthState()
    data class Authenticated(val userId: String, val email: String) : AuthState()
}

data class SignUpResult(val needsConfirmation: Boolean)

interface AuthRepository {
    /** Emits the current auth state; backed by supabase-kt's `sessionStatus`. */
    val authState: Flow<AuthState>
    suspend fun signIn(email: String, password: String)
    suspend fun signUp(email: String, password: String, name: String): SignUpResult
    suspend fun signOut()
    suspend fun resetPassword(email: String)
    fun currentUserId(): String?
}

/** Input for creating a recipe (mirrors the create form). */
data class NewIngredient(
    val name: String,
    val quantity: Double,
    val unit: String,
    val notes: String? = null,
    val costPerUnit: Double? = null,
)

data class NewStep(
    val instruction: String,
    val timerSeconds: Int? = null,
)

data class NewRecipe(
    val title: String,
    val cuisine: String? = null,
    val servings: Int,
    val prepTime: Int? = null,
    val cookTime: Int? = null,
    val description: String? = null,
    val ingredients: List<NewIngredient> = emptyList(),
    val steps: List<NewStep> = emptyList(),
)

interface RecipeRepository {
    /** Observable, in-memory source of truth refreshed from Supabase. */
    val recipes: StateFlow<List<Recipe>>
    suspend fun refresh()
    suspend fun addRecipe(form: NewRecipe): Recipe
}
