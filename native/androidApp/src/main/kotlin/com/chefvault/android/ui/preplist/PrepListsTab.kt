package com.chefvault.android.ui.preplist

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.android.ui.common.formatQuantity
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.PrepItem
import kotlinx.coroutines.launch

@Composable
fun PrepListsTab(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "lists") {
        composable("lists") {
            PrepListsScreen(sdk, onCreate = { nav.navigate("create") })
        }
        composable("create") {
            CreatePrepListScreen(sdk, onDone = { nav.popBackStack() })
        }
    }
}

private enum class ItemFilter { ALL, TODO, COMPLETED }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrepListsScreen(sdk: ChefVaultSDK, onCreate: () -> Unit) {
    val lists by sdk.prepLists.prepLists.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var selectedId by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf(ItemFilter.ALL) }
    var confirmDelete by remember { mutableStateOf(false) }

    // Keep a valid selection: default to first, recover if the selected list disappears.
    val active = lists.firstOrNull { it.id == selectedId } ?: lists.firstOrNull()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Prep Lists") },
                actions = {
                    if (active != null) {
                        IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Default.Delete, "Delete list") }
                    }
                    IconButton(onClick = onCreate) { Icon(Icons.Default.Add, "New prep list") }
                },
            )
        },
    ) { padding ->
        if (lists.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Text("No prep lists yet — tap + to create one", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }

        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                lists.forEach { list ->
                    FilterChip(
                        selected = list.id == active?.id,
                        onClick = { selectedId = list.id },
                        label = { Text(list.name) },
                    )
                }
            }

            if (active != null) {
                val total = active.items.size
                val checked = active.items.count { it.checked }
                val progress = if (total > 0) checked.toFloat() / total else 0f
                val complete = total > 0 && checked == total

                CvCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("$checked / $total done", style = MaterialTheme.typography.titleMedium)
                            Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier.fillMaxWidth(),
                            color = if (complete) Color(0xFF22C55E) else MaterialTheme.colorScheme.primary,
                        )
                    }
                }

                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = filter == ItemFilter.ALL, onClick = { filter = ItemFilter.ALL }, shape = SegmentedButtonDefaults.itemShape(0, 3)) { Text("All") }
                    SegmentedButton(selected = filter == ItemFilter.TODO, onClick = { filter = ItemFilter.TODO }, shape = SegmentedButtonDefaults.itemShape(1, 3)) { Text("To-Do") }
                    SegmentedButton(selected = filter == ItemFilter.COMPLETED, onClick = { filter = ItemFilter.COMPLETED }, shape = SegmentedButtonDefaults.itemShape(2, 3)) { Text("Completed") }
                }

                val visible = active.items.filter {
                    when (filter) {
                        ItemFilter.ALL -> true
                        ItemFilter.TODO -> !it.checked
                        ItemFilter.COMPLETED -> it.checked
                    }
                }

                if (visible.isEmpty()) {
                    Text("Nothing here.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    visible.groupBy { it.station }.forEach { (station, items) ->
                        CvCard {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                SectionHeader(station)
                                items.forEach { item ->
                                    PrepItemRow(item) {
                                        scope.launch { runCatching { sdk.prepLists.toggleItem(active.id, item.id) } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (confirmDelete && active != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete \"${active.name}\"?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    selectedId = null
                    scope.launch { runCatching { sdk.prepLists.delete(active.id) } }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun PrepItemRow(item: PrepItem, onToggle: () -> Unit) {
    Surface(onClick = onToggle, color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (item.checked) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
                contentDescription = if (item.checked) "Done" else "To do",
                tint = if (item.checked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp),
            )
            Text(
                item.name,
                style = MaterialTheme.typography.bodyMedium,
                color = if (item.checked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
            )
            Text(
                "${formatQuantity(item.quantity)} ${item.unit}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
