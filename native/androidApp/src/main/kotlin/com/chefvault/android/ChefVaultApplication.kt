package com.chefvault.android

import android.app.Application
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.SupabaseConfig

/** Holds the single shared SDK instance, configured from BuildConfig (injected secrets). */
class ChefVaultApplication : Application() {
    lateinit var sdk: ChefVaultSDK
        private set

    override fun onCreate() {
        super.onCreate()
        val host = BuildConfig.SUPABASE_HOST.trim()
        val url = if (host.isEmpty()) "" else "https://$host"
        sdk = ChefVaultSDK(SupabaseConfig(url = url, anonKey = BuildConfig.SUPABASE_ANON_KEY.trim()))
    }
}
