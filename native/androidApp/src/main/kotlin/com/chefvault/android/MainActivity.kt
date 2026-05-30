package com.chefvault.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.chefvault.android.ui.ChefVaultApp
import com.chefvault.android.ui.theme.ChefVaultTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val sdk by lazy { (application as ChefVaultApplication).sdk }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChefVaultTheme { ChefVaultApp(sdk) }
        }
        handleOAuthCallback(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleOAuthCallback(intent)
    }

    /** Completes a web-OAuth flow when the browser redirects back to chefvault://. */
    private fun handleOAuthCallback(intent: Intent?) {
        val data = intent?.data?.toString() ?: return
        if (!data.startsWith("chefvault://")) return
        CoroutineScope(Dispatchers.Main).launch {
            runCatching { sdk.auth.completeOAuth(data) }
        }
    }
}
