package com.chefvault.android.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlAppBar
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlSetGroup
import com.chefvault.android.ui.theme.SlTile
import com.chefvault.android.ui.theme.SlVariant
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.Plan
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
    val sl = LocalSl.current
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var confirmSignOut by remember { mutableStateOf(false) }
    var useSystemTheme by remember { mutableStateOf(true) }

    val isPro = profile?.plan == Plan.PRO
    val name = profile?.name ?: "—"

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlAppBar(title = "Settings")
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                // Profile row
                Row(
                    Modifier.fillMaxWidth().clickable { onProfile() },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(13.dp),
                ) {
                    SlTile(letter = initialsFor(name), sizeDp = 58, corner = 29)
                    Column {
                        Text(name, style = slDisplay(17.0, FontWeight.Bold), color = sl.text)
                        Text(profileSubtitle(profile), style = slBody(12.0), color = sl.muted, maxLines = 1)
                    }
                }

                ProCard(isPro = isPro)

                SlSetGroup("Account & Security") {
                    SlSetRow(label = "Profile Information", value = "Edit", onClick = onProfile)
                    SlDivider()
                    SlSetRow(label = "Subscription", value = if (isPro) "Pro" else "Free", onClick = onSubscription)
                    SlDivider()
                    SlSetRow(label = "Security & Password", value = "Manage", onClick = onSecurity)
                }

                SlSetGroup("Preferences") {
                    SlSetRow(label = "Use system theme", toggle = useSystemTheme, onToggle = { useSystemTheme = it })
                    SlDivider()
                    SlSetRow(
                        label = "Default units",
                        value = unitsLabel(profile?.defaultUnits ?: MeasurementSystem.METRIC),
                        onClick = onUnits,
                    )
                    SlDivider()
                    SlSetRow(label = "Language", value = languageName(profile?.language ?: "en"), onClick = onLanguage)
                }

                SlSetGroup("Data") {
                    SlSetRow(
                        label = "Auto-backup",
                        toggle = profile?.autoBackup ?: false,
                        onToggle = { on -> scope.launch { runCatching { sdk.profile.update(ProfileUpdate(autoBackup = on)) } } },
                    )
                    SlDivider()
                    SlSetRow(label = "Export all data", value = "", onClick = onDataBackup)
                }

                SlButton(label = "Log Out", variant = SlVariant.Danger, modifier = Modifier.fillMaxWidth()) {
                    confirmSignOut = true
                }

                Text(
                    "CHEFVAULT v1.0.0 · WINERY APPS",
                    style = slMono(10.0),
                    color = sl.faint,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                )
            }
        }
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Sign out of ChefVault?") },
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

private fun profileSubtitle(profile: UserProfile?): String {
    val title = profile?.title?.takeIf { it.isNotBlank() }
    val email = profile?.email?.takeIf { it.isNotBlank() }
    return listOfNotNull(title, email).joinToString(" · ")
}

@Composable
private fun ProCard(isPro: Boolean) {
    val sl = LocalSl.current
    Box(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(listOf(sl.accent.copy(alpha = 0.22f), sl.surface)),
            )
            .border(1.dp, sl.accent.copy(alpha = 0.30f), RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f)) {
                    Text("ChefVault ", style = slDisplay(16.0, FontWeight.ExtraBold), color = sl.text)
                    Text("Pro", style = slDisplay(16.0, FontWeight.ExtraBold), color = sl.accent)
                }
                if (isPro) {
                    Box(
                        Modifier.clip(CircleShape).background(sl.accent)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "ACTIVE",
                            style = slMono(9.5, FontWeight.Bold).copy(letterSpacing = 0.5.sp),
                            color = sl.onAccent,
                        )
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ProFeature("Unlimited recipes")
                ProFeature("Ingredient costing")
                ProFeature("Team Sync — coming soon", faint = true)
            }
        }
    }
}

@Composable
private fun ProFeature(text: String, faint: Boolean = false) {
    val sl = LocalSl.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("✓", style = slBody(11.0, FontWeight.Bold), color = if (faint) sl.faint else sl.accent)
        Text(text, style = slBody(13.0), color = if (faint) sl.faint else sl.text)
    }
}
