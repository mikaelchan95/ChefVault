package com.chefvault.android.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewCollection
import com.chefvault.shared.model.CollectionStatus
import kotlinx.coroutines.launch

private val PresetColors = listOf(
    "#FF7A00", "#EF4444", "#22C55E", "#3B82F6",
    "#A855F7", "#EC4899", "#F59E0B", "#14B8A6",
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CreateCollectionScreen(sdk: ChefVaultSDK, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var status by remember { mutableStateOf(CollectionStatus.ACTIVE) }
    var color by remember { mutableStateOf(PresetColors.first()) }
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Collection") },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Default.Close, "Cancel") } },
                actions = { TextButton(onClick = { save() }, enabled = name.isNotBlank() && !busy) { Text("Save") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Live preview
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(collectionColor(color)),
                contentAlignment = Alignment.BottomStart,
            ) {
                Text(
                    name.ifBlank { "Collection name" },
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(16.dp),
                )
            }

            OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(description, { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())

            SectionHeader("Status")
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(selected = status == CollectionStatus.ACTIVE, onClick = { status = CollectionStatus.ACTIVE }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Active") }
                SegmentedButton(selected = status == CollectionStatus.DRAFT, onClick = { status = CollectionStatus.DRAFT }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Draft") }
            }

            SectionHeader("Color")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                PresetColors.forEach { hex ->
                    val selected = hex == color
                    Box(
                        Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(collectionColor(hex))
                            .then(
                                if (selected) Modifier.border(3.dp, MaterialTheme.colorScheme.onSurface, CircleShape)
                                else Modifier,
                            )
                            .clickable { color = hex },
                    )
                }
            }
        }
    }
}
