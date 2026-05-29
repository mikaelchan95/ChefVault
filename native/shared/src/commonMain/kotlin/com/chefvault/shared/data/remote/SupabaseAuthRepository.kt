package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.AuthState
import com.chefvault.shared.data.repository.SignUpResult
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseAuthRepository(private val client: SupabaseClient) : AuthRepository {

    override val authState: Flow<AuthState> = client.auth.sessionStatus.map { status ->
        when (status) {
            is SessionStatus.Authenticated -> AuthState.Authenticated(
                userId = status.session.user?.id.orEmpty(),
                email = status.session.user?.email.orEmpty(),
            )
            is SessionStatus.NotAuthenticated -> AuthState.NotAuthenticated
            else -> AuthState.Loading
        }
    }

    override suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun signUp(email: String, password: String, name: String): SignUpResult {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject { put("name", name) }
        }
        // No active session after sign-up means email confirmation is required.
        return SignUpResult(needsConfirmation = client.auth.currentSessionOrNull() == null)
    }

    override suspend fun signOut() {
        client.auth.signOut()
    }

    override suspend fun resetPassword(email: String) {
        client.auth.resetPasswordForEmail(email)
    }

    override fun currentUserId(): String? = client.auth.currentSessionOrNull()?.user?.id
}
