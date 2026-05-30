package com.chefvault.android.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import coil3.compose.AsyncImage
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.UserProfile
import kotlinx.coroutines.launch

@Composable
fun SettingsTab(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "hub") {
        composable("hub") {
            SettingsHubScreen(
                sdk,
                onProfile = { nav.navigate("profile") },
                onUnits = { nav.navigate("units") },
                onLanguage = { nav.navigate("language") },
                onSecurity = { nav.navigate("security") },
                onDataBackup = { nav.navigate("databackup") },
                onSubscription = { nav.navigate("subscription") },
            )
        }
        composable("profile") { ProfileScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("units") { UnitsScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("language") { LanguageScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("security") { SecurityScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("databackup") { DataBackupScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("subscription") { SubscriptionScreen(sdk, onBack = { nav.popBackStack() }) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsHubScreen(
    sdk: ChefVaultSDK,
    onProfile: () -> Unit,
    onUnits: () -> Unit,
    onLanguage: () -> Unit,
    onSecurity: () -> Unit,
    onDataBackup: () -> Unit,
    onSubscription: () -> Unit,
) {
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var confirmSignOut by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopAppBar(title = { Text("Settings") }) }) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            ProfileHeader(profile)

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionHeader("Account & Security")
                CvCard {
                    Column {
                        SettingsRow(title = "Profile", subtitle = "Name, title, avatar", onClick = onProfile)
                        SettingsRow(title = "Subscription", subtitle = planLabel(profile?.plan), onClick = onSubscription)
                        SettingsRow(title = "Security", subtitle = "Password, delete account", onClick = onSecurity, last = true)
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionHeader("App Preferences")
                CvCard {
                    Column {
                        SettingsRow(
                            title = "Default Units",
                            trailing = unitsLabel(profile?.defaultUnits ?: MeasurementSystem.METRIC),
                            onClick = onUnits,
                        )
                        SettingsRow(
                            title = "Data Backup",
                            trailing = if (profile?.autoBackup != false) "Auto-sync ON" else "Auto-sync OFF",
                            onClick = onDataBackup,
                        )
                        SettingsRow(
                            title = "Language",
                            trailing = languageName(profile?.language ?: "en"),
                            onClick = onLanguage,
                            last = true,
                        )
                    }
                }
            }

            CvCard(modifier = Modifier.clickable { confirmSignOut = true }) {
                Text("Sign Out", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
            }

            Box(Modifier.fillMaxWidth(), Alignment.Center) {
                Text("v0.1.0", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Sign out?") },
            text = { Text("You'll need to sign in again to access your recipes.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmSignOut = false
                    scope.launch { runCatching { sdk.auth.signOut() } }
                }) { Text("Sign Out") }
            },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun ProfileHeader(profile: UserProfile?) {
    CvCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                val avatar = profile?.avatarUrl
                if (avatar.isNullOrBlank()) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp))
                } else {
                    AsyncImage(
                        model = avatar,
                        contentDescription = "Avatar",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
            }
            Column(Modifier.weight(1f)) {
                Text(profile?.name ?: "—", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, maxLines = 1)
                profile?.title?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, maxLines = 1)
                }
                Text(profile?.email ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            }
        }
    }
}
