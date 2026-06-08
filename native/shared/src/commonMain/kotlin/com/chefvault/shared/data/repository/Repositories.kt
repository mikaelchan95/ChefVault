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
    @Throws(Exception::class) suspend fun signIn(email: String, password: String)
    @Throws(Exception::class) suspend fun signUp(email: String, password: String, name: String): SignUpResult
    @Throws(Exception::class) suspend fun signOut()
    @Throws(Exception::class) suspend fun resetPassword(email: String)
    @Throws(Exception::class) suspend fun updatePassword(newPassword: String)
    /** Calls the `delete_user_account` SECURITY DEFINER RPC, then signs out. */
    @Throws(Exception::class) suspend fun deleteAccount()
    /** Native ID-token sign-in: token obtained on-device (no web browser). */
    @Throws(Exception::class) suspend fun signInWithIdToken(provider: IdTokenProvider, idToken: String, nonce: String? = null)
    /** Returns the provider's hosted OAuth URL to open in a platform web-auth session. */
    @Throws(Exception::class) suspend fun oAuthUrl(provider: OAuthProvider, redirectUrl: String): String
    /** Completes a web-OAuth flow from the redirect callback URL (imports the session). */
    @Throws(Exception::class) suspend fun completeOAuth(callbackUrl: String)
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
    val imageUrl: String? = null,
    val platingPhotos: List<String> = emptyList(),
    val sourceUrl: String? = null,
    val ingredients: List<NewIngredient> = emptyList(),
    val steps: List<NewStep> = emptyList(),
)

/** Result of importing a recipe from a URL: a prefilled draft + any parse warnings. */
data class ImportedRecipe(
    val recipe: NewRecipe,
    val warnings: List<String> = emptyList(),
)

interface RecipeRepository {
    /** Observable, in-memory source of truth refreshed from Supabase. */
    val recipes: StateFlow<List<Recipe>>
    @Throws(Exception::class) suspend fun refresh()
    @Throws(Exception::class) suspend fun addRecipe(form: NewRecipe): Recipe
    /** Parses a shared URL (TikTok/Instagram/blog) into a draft recipe via the
     *  import-recipe edge function. Returns a draft to review — does NOT save. */
    @Throws(Exception::class) suspend fun importFromUrl(url: String): ImportedRecipe
    /** Parses spoken or pasted recipe text into a draft recipe via the
     *  parse-recipe-text edge function. Returns a draft to review — does NOT save. */
    @Throws(Exception::class) suspend fun createDraftFromText(text: String): ImportedRecipe
    /** Replaces scalar fields and (wholesale) ingredients + steps, mirroring the RN store. */
    @Throws(Exception::class) suspend fun update(id: String, form: NewRecipe)
    @Throws(Exception::class) suspend fun delete(id: String)
    @Throws(Exception::class) suspend fun deleteMany(ids: List<String>)
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
    @Throws(Exception::class) suspend fun refresh()
    @Throws(Exception::class) suspend fun create(form: NewCollection): Collection
    @Throws(Exception::class) suspend fun update(id: String, form: NewCollection)
    @Throws(Exception::class) suspend fun delete(id: String)
    @Throws(Exception::class) suspend fun addRecipe(collectionId: String, recipeId: String)
    @Throws(Exception::class) suspend fun removeRecipe(collectionId: String, recipeId: String)
}

interface PrepListRepository {
    val prepLists: StateFlow<List<PrepList>>
    @Throws(Exception::class) suspend fun refresh()
    /** Aggregates the selected recipes' ingredients into station-assigned prep items. */
    @Throws(Exception::class) suspend fun createFromRecipes(name: String, date: String, recipeIds: List<String>): PrepList
    @Throws(Exception::class) suspend fun toggleItem(listId: String, itemId: String)
    @Throws(Exception::class) suspend fun delete(id: String)
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
    @Throws(Exception::class) suspend fun refresh()
    @Throws(Exception::class) suspend fun update(update: ProfileUpdate)
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
    @Throws(Exception::class) suspend fun upload(bucket: StorageBucket, fileName: String, bytes: ByteArray, contentType: String): String
}
