package com.chefvault.shared.data

import com.chefvault.shared.data.remote.SupabaseAuthRepository
import com.chefvault.shared.data.remote.SupabaseCollectionRepository
import com.chefvault.shared.data.remote.SupabasePrepListRepository
import com.chefvault.shared.data.remote.SupabaseProfileRepository
import com.chefvault.shared.data.remote.SupabaseRecipeRepository
import com.chefvault.shared.data.remote.SupabaseStorageRepository
import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.CollectionRepository
import com.chefvault.shared.data.repository.PrepListRepository
import com.chefvault.shared.data.repository.ProfileRepository
import com.chefvault.shared.data.repository.RecipeRepository
import com.chefvault.shared.data.repository.StorageRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.github.jan.supabase.storage.Storage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

/** Supabase project configuration, injected from each platform (never hardcoded). */
data class SupabaseConfig(val url: String, val anonKey: String)

@OptIn(ExperimentalSerializationApi::class)
internal fun createChefVaultSupabaseClient(config: SupabaseConfig): SupabaseClient =
    createSupabaseClient(supabaseUrl = config.url, supabaseKey = config.anonKey) {
        defaultSerializer = KotlinXSerializer(
            Json {
                ignoreUnknownKeys = true
                namingStrategy = JsonNamingStrategy.SnakeCase
                encodeDefaults = true
            },
        )
        install(Auth)
        install(Postgrest)
        install(Storage)
    }

/**
 * Composition root for the shared module. Constructs the Supabase client and repositories
 * and exposes them to the native UIs. A lightweight hand-rolled container is sufficient
 * for the current graph; Koin can replace it when the graph grows.
 */
class ChefVaultSDK(config: SupabaseConfig) {
    private val client: SupabaseClient = createChefVaultSupabaseClient(config)
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val auth: AuthRepository = SupabaseAuthRepository(client)
    val recipes: RecipeRepository = SupabaseRecipeRepository(client, auth, scope)
    val collections: CollectionRepository = SupabaseCollectionRepository(client, auth)
    val prepLists: PrepListRepository = SupabasePrepListRepository(client, auth, recipes)
    val profile: ProfileRepository = SupabaseProfileRepository(client, auth)
    val storage: StorageRepository = SupabaseStorageRepository(client, auth)
}
