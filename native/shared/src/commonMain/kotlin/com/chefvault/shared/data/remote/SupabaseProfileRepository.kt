package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.ProfileRepository
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.Plan
import com.chefvault.shared.model.UserProfile
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

@Serializable
internal data class ProfileRow(
    val id: String,
    val email: String = "",
    val name: String = "",
    val title: String? = null,
    val avatarUrl: String? = null,
    val plan: String = "free",
    val defaultUnits: String = "metric",
    val language: String = "en",
    val autoBackup: Boolean = true,
)

internal fun ProfileRow.toDomain(): UserProfile = UserProfile(
    id = id,
    email = email,
    name = name,
    title = title,
    avatarUrl = avatarUrl,
    plan = if (plan == "pro") Plan.PRO else Plan.FREE,
    defaultUnits = if (defaultUnits == "imperial") MeasurementSystem.IMPERIAL else MeasurementSystem.METRIC,
    language = language,
    autoBackup = autoBackup,
)

class SupabaseProfileRepository(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
) : ProfileRepository {

    private val _profile = MutableStateFlow<UserProfile?>(null)
    override val profile: StateFlow<UserProfile?> = _profile.asStateFlow()

    override suspend fun refresh() {
        val uid = auth.currentUserId() ?: return
        val row = client.from("profiles")
            .select { filter { eq("id", uid) } }
            .decodeSingleOrNull<ProfileRow>()
        _profile.value = row?.toDomain()
    }

    /** Partial update: null fields are left unchanged (cannot clear a value to null). */
    override suspend fun update(update: ProfileUpdate) {
        val uid = auth.currentUserId() ?: error("Not authenticated")

        _profile.value = _profile.value?.let { p ->
            p.copy(
                name = update.name ?: p.name,
                title = update.title ?: p.title,
                avatarUrl = update.avatarUrl ?: p.avatarUrl,
                defaultUnits = update.defaultUnits ?: p.defaultUnits,
                language = update.language ?: p.language,
                autoBackup = update.autoBackup ?: p.autoBackup,
            )
        }

        client.from("profiles").update(
            {
                update.name?.let { set("name", it) }
                update.title?.let { set("title", it) }
                update.avatarUrl?.let { set("avatar_url", it) }
                update.defaultUnits?.let {
                    set("default_units", if (it == MeasurementSystem.IMPERIAL) "imperial" else "metric")
                }
                update.language?.let { set("language", it) }
                update.autoBackup?.let { set("auto_backup", it) }
            },
        ) { filter { eq("id", uid) } }
    }
}
