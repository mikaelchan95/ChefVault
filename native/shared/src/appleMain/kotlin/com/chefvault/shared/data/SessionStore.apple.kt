package com.chefvault.shared.data

import com.russhwolf.settings.ExperimentalSettingsImplementation
import com.russhwolf.settings.KeychainSettings
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.SettingsSessionManager

/** Keychain-backed session persistence — secure storage for the supabase-kt session. */
@OptIn(ExperimentalSettingsImplementation::class)
internal actual fun platformSessionManager(): SessionManager? =
    SettingsSessionManager(KeychainSettings(service = "com.chefvault.app.session"))
