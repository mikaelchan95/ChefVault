package com.chefvault.android.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewCollection
import com.chefvault.shared.model.CollectionStatus
import kotlinx.coroutines.launch

@Composable
fun CreateCollectionScreen(sdk: ChefVaultSDK, onDone: () -> Unit) {
    val sl = LocalSl.current
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var status by remember { mutableStateOf(CollectionStatus.ACTIVE) }
    var color by remember { mutableStateOf(CollectionPresetHexes.first()) }
    var busy by remember { mutableStateOf(false) }

    fun save() {
        busy = true
        scope.launch {
            runCatching {
                sdk.collections.create(
                    NewCollection(
                        name = name,
                        description = description.ifBlank { null },
                        color = color,
                        status = status,
                    ),
                )
            }
            busy = false
            onDone()
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            // Header: Cancel + centered title (mirrors iOS sheetHeader)
            Box(Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 18.dp)) {
                Text(
                    "Cancel",
                    style = slBody(14.5),
                    color = sl.muted,
                    modifier = Modifier.align(Alignment.CenterStart).clickable { onDone() },
                )
                Text(
                    "New Collection",
                    style = slDisplay(16.0, FontWeight.Bold),
                    color = sl.text,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            SlDivider()

            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp).padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlKicker("Name")
                    SlTextField(value = name, onValueChange = { name = it }, placeholder = "Collection name")
                }
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlKicker("Description")
                    SlTextField(value = description, onValueChange = { description = it }, placeholder = "Optional description")
                }
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlKicker("Status")
                    StatusSegmented(status) { status = it }
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SlKicker("Cover")
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        CollectionPresetHexes.forEach { hex ->
                            ColorSwatch(hex = hex, selected = hex == color) { color = hex }
                        }
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SlKicker("Preview")
                    PreviewCard(name = name.ifBlank { "Collection name" }, colorHex = color, status = status)
                }
                SlButton(
                    label = "Create Collection",
                    modifier = Modifier.fillMaxWidth(),
                    enabled = name.isNotBlank() && !busy,
                ) { save() }
            }
        }
    }
}

@Composable
private fun ColorSwatch(hex: String, selected: Boolean, onClick: () -> Unit) {
    val sl = LocalSl.current
    Box(
        Modifier
            .size(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(collectionColor(hex))
            .border(
                if (selected) 2.dp else 1.dp,
                if (selected) sl.accent else sl.line2,
                RoundedCornerShape(12.dp),
            )
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
        }
    }
}

/** Compact hero preview mirroring the collection detail hero look. */
@Composable
private fun PreviewCard(name: String, colorHex: String, status: CollectionStatus) {
    val sl = LocalSl.current
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, sl.line, RoundedCornerShape(16.dp)),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(96.dp)
                .background(collectionColor(colorHex)),
            contentAlignment = Alignment.BottomStart,
        ) {
            Row(
                Modifier.fillMaxWidth().padding(14.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(name, style = slDisplay(18.0, FontWeight.ExtraBold), color = Color.White, maxLines = 1)
                SlCollectionStatusPill(status)
            }
        }
    }
}
