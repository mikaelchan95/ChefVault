package com.chefvault.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import com.chefvault.android.ui.ChefVaultApp
import com.chefvault.android.ui.theme.ChefVaultTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val sdk by lazy { (application as ChefVaultApplication).sdk }

    // A link shared into ChefVault (ACTION_SEND) awaiting the import screen.
    private val pendingShareUrl = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pendingShareUrl.value = extractSharedUrl(intent)
        setContent {
            ChefVaultTheme {
                ChefVaultApp(
                    sdk,
                    pendingShareUrl = pendingShareUrl.value,
                    onShareConsumed = { pendingShareUrl.value = null },
                )
            }
        }
        handleOAuthCallback(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractSharedUrl(intent)?.let { pendingShareUrl.value = it }
        handleOAuthCallback(intent)
    }

    /** Pulls the shared link out of an ACTION_SEND text intent (TikTok/IG/YouTube/browser). */
    private fun extractSharedUrl(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND) return null
        val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return null
        return Regex("""https?://\S+""").find(text)?.value
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
