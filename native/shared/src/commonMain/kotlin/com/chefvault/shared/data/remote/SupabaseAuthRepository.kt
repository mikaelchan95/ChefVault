package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.AuthState
import com.chefvault.shared.data.repository.IdTokenProvider
import com.chefvault.shared.data.repository.OAuthProvider
import com.chefvault.shared.data.repository.SignUpResult
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Apple
import io.github.jan.supabase.auth.providers.Facebook
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
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

    override suspend fun updatePassword(newPassword: String) {
        client.auth.updateUser { password = newPassword }
    }

    override suspend fun deleteAccount() {
        // The server-side SECURITY DEFINER RPC cascades all user data, storage, and the
        // auth record; sign out afterwards to clear the local session (mirrors authStore).
        client.postgrest.rpc("delete_user_account")
        client.auth.signOut()
    }

    override suspend fun signInWithIdToken(provider: IdTokenProvider, idToken: String, nonce: String?) {
        client.auth.signInWith(IDToken) {
            this.idToken = idToken
            this.provider = when (provider) {
                IdTokenProvider.APPLE -> Apple
                IdTokenProvider.GOOGLE -> Google
            }
            this.nonce = nonce
        }
    }

    override suspend fun oAuthUrl(provider: OAuthProvider, redirectUrl: String): String =
        client.auth.getOAuthUrl(
            when (provider) {
                OAuthProvider.GOOGLE -> Google
                OAuthProvider.FACEBOOK -> Facebook
            },
            redirectUrl,
        )

    override suspend fun completeOAuth(callbackUrl: String) {
        // Implicit-flow tokens arrive in the URL fragment (#access_token=…&refresh_token=…).
        // Exchange the refresh token for a fresh session and import it.
        val params = callbackUrl.substringAfter('#', "").ifEmpty { callbackUrl.substringAfter('?', "") }
        val refreshToken = params.split('&')
            .map { it.split('=', limit = 2) }
            .firstOrNull { it.size == 2 && it[0] == "refresh_token" }
            ?.get(1)
            ?: error("No refresh token in OAuth callback")
        val session = client.auth.refreshSession(refreshToken)
        client.auth.importSession(session)
    }

    override fun currentUserId(): String? = client.auth.currentSessionOrNull()?.user?.id
}
