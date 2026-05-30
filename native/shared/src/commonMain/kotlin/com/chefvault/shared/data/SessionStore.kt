package com.chefvault.shared.data

import io.github.jan.supabase.auth.SessionManager

/**
 * Platform-provided session persistence. iOS/Apple back it with the Keychain
 * (upgrade from the Expo app's plaintext AsyncStorage); platforms returning null fall
 * back to supabase-kt's default manager.
 */
internal expect fun platformSessionManager(): SessionManager?
