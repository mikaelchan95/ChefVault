package com.chefvault.shared.data.repository

import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.PrepList
import com.chefvault.shared.model.Recipe
import com.chefvault.shared.model.UserProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/** Auth state exposed to the UI. Sealed so SKIE maps it to an exhaustive Swift enum. */
sealed class AuthState {
    data object Loading : AuthState()
    data object NotAuthenticated : AuthState()
    data class Authenticated(val userId: String, val email: String) : AuthState()
}

data class SignUpResult(val needsConfirmation: Boolean)

/** Provider for native ID-token sign-in (Sign in with Apple / Google One Tap). */
enum class IdTokenProvider { APPLE, GOOGLE }

/** Provider for hosted web-OAuth opened in a platform web-auth session. */
enum class OAuthProvider { GOOGLE, FACEBOOK }

interface AuthRepository {
    /** Emits the current auth state; backed by supabase-kt's `sessionStatus`. */
    val authState: Flow<AuthState>
    suspend fun signIn(email: String, password: String)
    suspend fun signUp(email: String, password: String, name: String): SignUpResult
    suspend fun signOut()
    suspend fun resetPassword(email: String)
    suspend fun updatePassword(newPassword: String)
    /** Calls the `delete_user_account` SECURITY DEFINER RPC, then signs out. */
    suspend fun deleteAccount()
    /** Native ID-token sign-in: token obtained on-device (no web browser). */
    suspend fun signInWithIdToken(provider: IdTokenProvider, idToken: String, nonce: String? = null)
    /** Returns the provider's hosted OAuth URL to open in a platform web-auth session. */
    suspend fun oAuthUrl(provider: OAuthProvider, redirectUrl: String): String
    /** Completes a web-OAuth flow from the redirect callback URL (imports the session). */
    suspend fun completeOAuth(callbackUrl: String)
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
    /** Replaces scalar fields and (wholesale) ingredients + steps, mirroring the RN store. */
    suspend fun update(id: String, form: NewRecipe)
    suspend fun delete(id: String)
    suspend fun deleteMany(ids: List<String>)
}

/** Input for creating/updating a collection (mirrors the collection form). */
data class NewCollection(
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val status: CollectionStatus = CollectionStatus.ACTIVE,
)

interface CollectionRepository {
    val collections: StateFlow<List<Collection>>
    suspend fun refresh()
    suspend fun create(form: NewCollection): Collection
    suspend fun update(id: String, form: NewCollection)
    suspend fun delete(id: String)
    suspend fun addRecipe(collectionId: String, recipeId: String)
    suspend fun removeRecipe(collectionId: String, recipeId: String)
}

interface PrepListRepository {
    val prepLists: StateFlow<List<PrepList>>
    suspend fun refresh()
    /** Aggregates the selected recipes' ingredients into station-assigned prep items. */
    suspend fun createFromRecipes(name: String, date: String, recipeIds: List<String>): PrepList
    suspend fun toggleItem(listId: String, itemId: String)
    suspend fun delete(id: String)
}

/** Partial profile update — null fields are left unchanged. */
data class ProfileUpdate(
    val name: String? = null,
    val title: String? = null,
    val avatarUrl: String? = null,
    val defaultUnits: MeasurementSystem? = null,
    val language: String? = null,
    val autoBackup: Boolean? = null,
)

interface ProfileRepository {
    val profile: StateFlow<UserProfile?>
    suspend fun refresh()
    suspend fun update(update: ProfileUpdate)
}

/** Supabase Storage buckets used by the app. */
enum class StorageBucket(val id: String) {
    RECIPE_IMAGES("recipe-images"),
    AVATARS("avatars"),
}

interface StorageRepository {
    /**
     * Uploads [bytes] under `userId/[fileName]` and returns the public URL. The caller
     * supplies a unique [fileName] (e.g. `UUID().ext`) and the matching [contentType].
     */
    suspend fun upload(bucket: StorageBucket, fileName: String, bytes: ByteArray, contentType: String): String
}
