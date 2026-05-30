package com.chefvault.shared.data

import io.github.jan.supabase.auth.SessionManager

/**
 * Android relies on supabase-kt's default session persistence (SharedPreferences via the
 * library's startup-captured application context). Returning null keeps that default.
 */
internal actual fun platformSessionManager(): SessionManager? = null
