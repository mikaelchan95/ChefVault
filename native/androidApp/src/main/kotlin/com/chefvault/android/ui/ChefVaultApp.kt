package com.chefvault.android.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import com.chefvault.android.ui.auth.AuthFlow
import com.chefvault.android.ui.collection.CollectionsTab
import com.chefvault.android.ui.common.BusyIndicator
import com.chefvault.android.ui.preplist.PrepListsTab
import com.chefvault.android.ui.recipe.RecipesTab
import com.chefvault.android.ui.settings.SettingsTab
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.AuthState

@Composable
fun ChefVaultApp(sdk: ChefVaultSDK) {
    val authState by sdk.auth.authState.collectAsStateWithLifecycle(initialValue = AuthState.Loading)
    when (authState) {
        is AuthState.Authenticated -> MainScaffold(sdk)
        is AuthState.NotAuthenticated -> AuthFlow(sdk)
        AuthState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { BusyIndicator() }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Recipes("Recipes", Icons.Outlined.Restaurant),
    Collections("Collections", Icons.Outlined.Folder),
    Prep("Prep", Icons.Outlined.Checklist),
    Settings("Settings", Icons.Outlined.Settings),
}

@Composable
private fun MainScaffold(sdk: ChefVaultSDK) {
    var tab by remember { mutableStateOf(Tab.Recipes) }

    LaunchedEffect(Unit) {
        // Independent network round-trips — run concurrently (matches the iOS MainTabView).
        launch { runCatching { sdk.recipes.refresh() } }
        launch { runCatching { sdk.collections.refresh() } }
        launch { runCatching { sdk.prepLists.refresh() } }
        launch { runCatching { sdk.profile.refresh() } }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { entry ->
                    NavigationBarItem(
                        selected = tab == entry,
                        onClick = { tab = entry },
                        icon = { Icon(entry.icon, contentDescription = entry.label) },
                        label = { Text(entry.label) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (tab) {
                Tab.Recipes -> RecipesTab(sdk)
                Tab.Collections -> CollectionsTab(sdk)
                Tab.Prep -> PrepListsTab(sdk)
                Tab.Settings -> SettingsTab(sdk)
            }
        }
    }
}
