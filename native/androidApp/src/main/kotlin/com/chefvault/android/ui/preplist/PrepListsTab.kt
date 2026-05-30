package com.chefvault.android.ui.preplist

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.common.formatQuantity
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlAppBar
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlChip
import com.chefvault.android.ui.theme.SlFab
import com.chefvault.android.ui.theme.SlIconButton
import com.chefvault.android.ui.theme.SlProgressBar
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.PrepItem
import com.chefvault.shared.model.PrepList
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

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

private enum class ItemFilter(val label: String) { ALL("All"), TODO("To Do"), COMPLETED("Done") }

private val kickerParser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
private val kickerOut = SimpleDateFormat("EEE MMM d", Locale.US)

/** "Service · Fri May 30" — parses the selected list's date, else today. */
private fun serviceKicker(list: PrepList?): String {
    val date = list?.let { runCatching { kickerParser.parse(it.date) }.getOrNull() } ?: java.util.Date()
    return "Service · ${kickerOut.format(date)}"
}

@Composable
private fun PrepListsScreen(sdk: ChefVaultSDK, onCreate: () -> Unit) {
    val sl = LocalSl.current
    val lists by sdk.prepLists.prepLists.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var selectedId by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf(ItemFilter.ALL) }
    var confirmDelete by remember { mutableStateOf(false) }

    // Keep a valid selection: default to first, recover if the selected list disappears.
    val active = lists.firstOrNull { it.id == selectedId } ?: lists.firstOrNull()

    SlBackground {
        Column(Modifier.fillMaxSize().padding(top = 8.dp)) {
            SlAppBar(
                title = "Prep",
                kicker = serviceKicker(active),
                trailing = {
                    if (active != null) {
                        SlIconButton(Icons.Filled.MoreHoriz) { confirmDelete = true }
                    }
                },
            )

            if (lists.isEmpty()) {
                Box(Modifier.fillMaxSize().padding(horizontal = 18.dp), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("No prep lists yet", style = slDisplay(19.0, FontWeight.Bold), color = sl.text)
                        Text(
                            "Tap + to generate a prep list from your recipes",
                            style = slBody(13.0), color = sl.muted,
                        )
                    }
                }
            } else if (active != null) {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                        .padding(horizontal = 18.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    ListSelector(lists, active.id, onSelect = { selectedId = it }, onCreate = onCreate)
                    ProgressBlock(active)
                    FilterRow(filter, onSelect = { filter = it })
                    ItemSections(active, filter) { itemId ->
                        scope.launch { runCatching { sdk.prepLists.toggleItem(active.id, itemId) } }
                    }
                    Spacer(Modifier.size(96.dp))
                }
            }
        }

        Box(
            Modifier.align(Alignment.BottomEnd).navigationBarsPadding()
                .padding(end = 18.dp, bottom = 86.dp),
        ) {
            SlFab(onClick = onCreate)
        }
    }

    if (confirmDelete && active != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = sl.surface,
            title = { Text("Delete \"${active.name}\"?", style = slDisplay(17.0, FontWeight.Bold), color = sl.text) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    selectedId = null
                    scope.launch { runCatching { sdk.prepLists.delete(active.id) } }
                }) { Text("Delete", color = sl.danger) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel", color = sl.muted) } },
        )
    }
}

@Composable
private fun ListSelector(
    lists: List<PrepList>,
    activeId: String,
    onSelect: (String) -> Unit,
    onCreate: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        lists.forEach { list ->
            SlChip(label = list.name, active = list.id == activeId, onClick = { onSelect(list.id) })
        }
        SlChip(label = "+", active = false, onClick = onCreate)
    }
}

@Composable
private fun ProgressBlock(list: PrepList) {
    val sl = LocalSl.current
    val total = list.items.size
    val done = list.items.count { it.checked }
    val fraction = if (total > 0) done.toFloat() / total else 0f
    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("$done / $total PREPPED", style = slMono(11.0), color = sl.muted)
            Text("${(fraction * 100).toInt()}%", style = slMono(11.0, FontWeight.Bold), color = sl.accent)
        }
        SlProgressBar(fraction = fraction)
    }
}

@Composable
private fun FilterRow(filter: ItemFilter, onSelect: (ItemFilter) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ItemFilter.entries.forEach { option ->
            SlChip(label = option.label, active = filter == option, onClick = { onSelect(option) })
        }
    }
}

@Composable
private fun ItemSections(list: PrepList, filter: ItemFilter, onToggle: (String) -> Unit) {
    val sl = LocalSl.current
    val visible = list.items.filter {
        when (filter) {
            ItemFilter.ALL -> true
            ItemFilter.TODO -> !it.checked
            ItemFilter.COMPLETED -> it.checked
        }
    }
    if (visible.isEmpty()) {
        Text(
            "Nothing here.",
            style = slBody(13.0), color = sl.muted,
            modifier = Modifier.fillMaxWidth().padding(top = 28.dp),
        )
        return
    }
    val grouped = visible.groupBy { it.station }.toSortedMap()
    grouped.forEach { (station, items) ->
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            StationHead(station, items)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items.forEach { item ->
                    CheckRow(item) { onToggle(item.id) }
                }
            }
        }
    }
}

@Composable
private fun StationHead(name: String, items: List<PrepItem>) {
    val sl = LocalSl.current
    val done = items.count { it.checked }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(name, style = slDisplay(14.5, FontWeight.Bold), color = sl.text)
        Box(
            Modifier.padding(start = 8.dp)
                .clip(RoundedCornerShape(5.dp))
                .border(1.dp, sl.accent.copy(alpha = 0.5f), RoundedCornerShape(5.dp))
                .padding(horizontal = 6.dp, vertical = 1.dp),
        ) {
            Text(name.uppercase(), style = slMono(9.5, FontWeight.Bold).copy(letterSpacing = 0.5.sp), color = sl.accent)
        }
        Spacer(Modifier.weight(1f))
        Text("$done/${items.size}", style = slMono(10.5), color = sl.muted)
    }
}

@Composable
private fun CheckRow(item: PrepItem, onToggle: () -> Unit) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().clickable { onToggle() },
        horizontalArrangement = Arrangement.spacedBy(11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(22.dp).clip(RoundedCornerShape(7.dp))
                .background(if (item.checked) sl.accent else Color.Transparent)
                .border(1.5.dp, if (item.checked) Color.Transparent else sl.line2, RoundedCornerShape(7.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (item.checked) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = sl.onAccent, modifier = Modifier.size(14.dp))
            }
        }
        Text(
            "${formatQuantity(item.quantity)} ${item.unit}",
            style = slMono(12.5, FontWeight.Bold),
            color = if (item.checked) sl.faint else sl.accent,
            modifier = Modifier.width(50.dp),
        )
        Text(
            item.name,
            style = slBody(13.0),
            color = if (item.checked) sl.faint else sl.text,
            textDecoration = if (item.checked) TextDecoration.LineThrough else null,
            maxLines = 2,
            modifier = Modifier.weight(1f),
        )
    }
}
