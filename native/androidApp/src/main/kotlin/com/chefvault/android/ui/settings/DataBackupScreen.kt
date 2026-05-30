package com.chefvault.android.ui.settings

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.export.ExportBuilder
import java.io.File
import java.time.OffsetDateTime
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DataBackupScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val autoBackup = profile?.autoBackup != false
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Data Backup") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            CvCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Auto-sync", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Keep your data backed up to the cloud automatically.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = autoBackup,
                        onCheckedChange = { checked ->
                            scope.launch { runCatching { sdk.profile.update(ProfileUpdate(autoBackup = checked)) } }
                        },
                    )
                }
            }

            CvCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionHeader("Export Data")
                    Text("Download all your recipes, collections and prep lists as a JSON file.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = { export() }, enabled = !exporting, modifier = Modifier.fillMaxWidth()) {
                        if (exporting) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                        else Text("Export JSON", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}
