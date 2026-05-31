package com.chefvault.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.auth.AuthFlow
import com.chefvault.android.ui.collection.CollectionsTab
import com.chefvault.android.ui.common.BusyIndicator
import com.chefvault.android.ui.preplist.PrepListsTab
import com.chefvault.android.ui.recipe.RecipeImportScreen
import com.chefvault.android.ui.recipe.RecipesTab
import com.chefvault.android.ui.settings.SettingsTab
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.slBody
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.AuthState
import kotlinx.coroutines.launch

@Composable
fun ChefVaultApp(
    sdk: ChefVaultSDK,
    pendingShareUrl: String? = null,
    onShareConsumed: () -> Unit = {},
) {
    val authState by sdk.auth.authState.collectAsStateWithLifecycle(initialValue = AuthState.Loading)
    when (authState) {
        is AuthState.Authenticated -> MainScaffold(sdk, pendingShareUrl, onShareConsumed)
        is AuthState.NotAuthenticated -> AuthFlow(sdk)
        AuthState.Loading -> Box(Modifier.fillMaxSize().background(LocalSl.current.bg), Alignment.Center) { BusyIndicator() }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Recipes("Recipes", Icons.Outlined.Restaurant),
    Collections("Collections", Icons.Outlined.Folder),
    Prep("Prep", Icons.Outlined.Checklist),
    Settings("Settings", Icons.Outlined.Settings),
}

@Composable
private fun MainScaffold(
    sdk: ChefVaultSDK,
    pendingShareUrl: String? = null,
    onShareConsumed: () -> Unit = {},
) {
    var tab by remember { mutableStateOf(Tab.Recipes) }

    LaunchedEffect(Unit) {
        launch { runCatching { sdk.recipes.refresh() } }
        launch { runCatching { sdk.collections.refresh() } }
        launch { runCatching { sdk.prepLists.refresh() } }
        launch { runCatching { sdk.profile.refresh() } }
    }

    // Each tab paints its own SlBackground and pads its content for the bar; the custom
    // SL tab bar overlays the bottom.
    Box(Modifier.fillMaxSize()) {
        when (tab) {
            Tab.Recipes -> RecipesTab(sdk)
            Tab.Collections -> CollectionsTab(sdk)
            Tab.Prep -> PrepListsTab(sdk)
            Tab.Settings -> SettingsTab(sdk)
        }
        SlBottomBar(active = tab, onSelect = { tab = it }, modifier = Modifier.align(Alignment.BottomCenter))
        // A link shared into ChefVault → full-screen import overlay (its own background covers the tabs).
        if (pendingShareUrl != null) {
            Box(Modifier.fillMaxSize()) {
                RecipeImportScreen(sdk, onDone = onShareConsumed, initialUrl = pendingShareUrl)
            }
        }
    }
}

/** Floating capsule tab bar — a detached pill hovering above the system nav. The active tab is a
 *  filled accent chip that expands to show its label; the rest are icon-only. Mirrors iOS SLTabBar. */
@Composable
private fun SlBottomBar(active: Tab, onSelect: (Tab) -> Unit, modifier: Modifier = Modifier) {
    val sl = LocalSl.current
    Box(modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 18.dp, vertical = 8.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(CircleShape)
                .background(sl.elevated)
                .border(1.dp, sl.line2, CircleShape)
                .padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Tab.entries.forEach { t ->
                val on = t == active
                Row(
                    (if (on) Modifier else Modifier.weight(1f))
                        .clip(CircleShape)
                        .background(if (on) sl.accent else Color.Transparent)
                        .clickable { onSelect(t) }
                        .padding(horizontal = if (on) 16.dp else 0.dp, vertical = 11.dp),
                    horizontalArrangement = if (on) Arrangement.spacedBy(7.dp) else Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(t.icon, contentDescription = t.label, tint = if (on) sl.onAccent else sl.muted, modifier = Modifier.size(20.dp))
                    if (on) {
                        Text(t.label, style = slBody(13.5, FontWeight.SemiBold), color = sl.onAccent, maxLines = 1)
                    }
                }
            }
        }
    }
}
