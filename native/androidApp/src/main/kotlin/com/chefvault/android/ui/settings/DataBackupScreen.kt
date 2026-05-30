package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSetGroup
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.SlToggle
import com.chefvault.android.ui.theme.slBody
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.export.ExportBuilder
import java.io.File
import java.time.OffsetDateTime
import kotlinx.coroutines.launch

@Composable
fun DataBackupScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val autoBackup = profile?.autoBackup ?: false
    var exporting by remember { mutableStateOf(false) }

    fun export() {
        exporting = true
        scope.launch {
            runCatching {
                val json = ExportBuilder.build(
                    recipes = sdk.recipes.recipes.value,
                    collections = sdk.collections.collections.value,
                    prepLists = sdk.prepLists.prepLists.value,
                    profile = sdk.profile.profile.value,
                    exportedAt = OffsetDateTime.now().toString(),
                )
                val file = File(context.cacheDir, "chefvault-export.json")
                file.writeText(json)
            }.onSuccess {
                Toast.makeText(context, "Export saved to app storage.", Toast.LENGTH_LONG).show()
            }.onFailure {
                Toast.makeText(context, "Export failed: ${it.message}", Toast.LENGTH_LONG).show()
            }
            exporting = false
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Data Backup", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 16.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SlSetGroup("Sync") {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Auto-backup", style = slBody(13.5), color = sl.text)
                            Text(
                                "Recipes and collections sync automatically to the cloud.",
                                style = slBody(11.5), color = sl.muted,
                            )
                        }
                        SlToggle(
                            checked = autoBackup,
                            onCheckedChange = { checked ->
                                scope.launch { runCatching { sdk.profile.update(ProfileUpdate(autoBackup = checked)) } }
                            },
                        )
                    }
                }

                SlKicker("Export", modifier = Modifier.padding(start = 4.dp, top = 4.dp))
                SlButton(
                    label = if (exporting) "Exporting…" else "Export all data (JSON)",
                    enabled = !exporting,
                    modifier = Modifier.fillMaxWidth(),
                ) { export() }
            }
        }
    }
}
