package com.chefvault.android.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.SlVariant
import com.chefvault.android.ui.theme.slBody
import com.chefvault.shared.data.ChefVaultSDK
import kotlinx.coroutines.launch

@Composable
fun SecurityScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val scope = rememberCoroutineScope()

    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    val passwordsMismatch = confirmPassword.isNotEmpty() && newPassword != confirmPassword
    val canSubmit = currentPassword.isNotEmpty() && newPassword.length >= 8 && newPassword == confirmPassword && !busy

    fun changePassword() {
        error = null
        success = false
        busy = true
        scope.launch {
            try {
                sdk.auth.updatePassword(newPassword)
                success = true
                currentPassword = ""
                newPassword = ""
                confirmPassword = ""
            } catch (e: Exception) {
                error = e.message ?: "Couldn't update password."
            } finally {
                busy = false
            }
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Security", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 16.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SlKicker("Change password", modifier = Modifier.padding(start = 4.dp))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SlTextField(
                        value = currentPassword, onValueChange = { currentPassword = it },
                        placeholder = "Current password", secure = true, keyboard = KeyboardType.Password,
                    )
                    SlTextField(
                        value = newPassword, onValueChange = { newPassword = it },
                        placeholder = "New password", secure = true, keyboard = KeyboardType.Password,
                    )
                    PasswordStrengthBar(newPassword)
                    SlTextField(
                        value = confirmPassword, onValueChange = { confirmPassword = it },
                        placeholder = "Confirm new password", secure = true, keyboard = KeyboardType.Password,
                    )
                    if (passwordsMismatch) {
                        Text("Passwords do not match.", style = slBody(12.0), color = sl.danger)
                    }
                    SlButton(
                        label = if (busy) "Updating…" else "Update password",
                        enabled = canSubmit,
                        modifier = Modifier.fillMaxWidth(),
                    ) { changePassword() }
                    if (success) Text("Password updated.", style = slBody(12.0), color = sl.good)
                    error?.let { Text(it, style = slBody(12.0), color = sl.danger) }
                }

                SlKicker("Danger zone", modifier = Modifier.padding(start = 4.dp, top = 8.dp))
                SlButton(label = "Delete account…", variant = SlVariant.Danger, modifier = Modifier.fillMaxWidth()) {
                    confirmDelete = true
                }
                Text(
                    "This cascades all recipes, collections, prep lists, photos and your login. It cannot be undone.",
                    style = slBody(12.0), color = sl.muted, modifier = Modifier.padding(start = 4.dp),
                )
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete account?") },
            text = { Text("This permanently removes all your data and cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { runCatching { sdk.auth.deleteAccount() } }
                }) { Text("Delete account") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}
