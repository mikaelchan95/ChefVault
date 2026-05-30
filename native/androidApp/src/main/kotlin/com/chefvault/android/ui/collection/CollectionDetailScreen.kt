package com.chefvault.android.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewCollection
import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import com.chefvault.shared.model.Recipe
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionDetailScreen(sdk: ChefVaultSDK, collectionId: String, onBack: () -> Unit) {
    val collections by sdk.collections.collections.collectAsStateWithLifecycle()
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val collection = collections.firstOrNull { it.id == collectionId }
    val scope = rememberCoroutineScope()

    var menuOpen by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var showAddSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(collection?.name ?: "Collection") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    if (collection != null) {
                        IconButton(onClick = { menuOpen = true }) { Icon(Icons.Default.MoreVert, "More") }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(text = { Text("Edit") }, onClick = { menuOpen = false; showEdit = true })
                            DropdownMenuItem(text = { Text("Delete") }, onClick = { menuOpen = false; confirmDelete = true })
                        }
                    }
                },
            )
        },
    ) { padding ->
        if (collection == null) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                Text("Collection unavailable", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }

        val members = remember(recipes, collection.recipeIds) {
            recipes.filter { it.id in collection.recipeIds }
        }

        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(collectionColor(collection.color)),
                contentAlignment = Alignment.BottomStart,
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(collection.name, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
                    collection.description?.takeIf { it.isNotBlank() }?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.9f), maxLines = 2)
                    }
                }
            }

            CvCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Stat("Recipes", collection.recipeIds.size.toString())
                    Stat("Created", collection.createdAt.take(10))
                    StatusChip(collection.status)
                }
            }

            Button(onClick = { showAddSheet = true }, modifier = Modifier.fillMaxWidth()) { Text("Add Recipes") }

            CvCard {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionHeader("Recipes")
                    if (members.isEmpty()) {
                        Text("No recipes yet — tap “Add Recipes”.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        members.forEachIndexed { index, recipe ->
                            MemberRow(recipe)
                            if (index < members.size - 1) HorizontalDivider()
                        }
                    }
                }
            }
        }
    }

    if (showAddSheet && collection != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(onDismissRequest = { showAddSheet = false }, sheetState = sheetState) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
                SectionHeader("Add Recipes")
                if (recipes.isEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(24.dp), Alignment.Center) {
                        Text("No recipes available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    LazyColumn {
                        items(recipes, key = { it.id }) { recipe ->
                            val inCollection = recipe.id in collection.recipeIds
                            RecipePickerRow(recipe, inCollection) {
                                scope.launch {
                                    runCatching {
                                        if (inCollection) sdk.collections.removeRecipe(collection.id, recipe.id)
                                        else sdk.collections.addRecipe(collection.id, recipe.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showEdit && collection != null) {
        EditCollectionDialog(
            collection = collection,
            onDismiss = { showEdit = false },
            onSave = { form ->
                showEdit = false
                scope.launch { runCatching { sdk.collections.update(collection.id, form) } }
            },
        )
    }

    if (confirmDelete && collection != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this collection?") },
            text = { Text("Recipes inside it are not deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { runCatching { sdk.collections.delete(collection.id) }; onBack() }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun MemberRow(recipe: Recipe) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(Modifier.weight(1f)) {
            Text(recipe.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, maxLines = 1)
            val meta = buildList {
                recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
                add("${recipe.servings} serv")
            }.joinToString(" · ")
            Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun RecipePickerRow(recipe: Recipe, checked: Boolean, onToggle: () -> Unit) {
    Surface(onClick = onToggle, color = Color.Transparent) {
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Checkbox(checked = checked, onCheckedChange = { onToggle() })
            Column(Modifier.weight(1f)) {
                Text(recipe.title, style = MaterialTheme.typography.bodyLarge, maxLines = 1)
                recipe.cuisine?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditCollectionDialog(collection: Collection, onDismiss: () -> Unit, onSave: (NewCollection) -> Unit) {
    var name by remember { mutableStateOf(collection.name) }
    var description by remember { mutableStateOf(collection.description ?: "") }
    var status by remember { mutableStateOf(collection.status) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit collection") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(description, { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = status == CollectionStatus.ACTIVE, onClick = { status = CollectionStatus.ACTIVE }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Active") }
                    SegmentedButton(selected = status == CollectionStatus.DRAFT, onClick = { status = CollectionStatus.DRAFT }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Draft") }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank(),
                onClick = {
                    onSave(
                        NewCollection(
                            name = name,
                            description = description.ifBlank { null },
                            color = collection.color,
                            icon = collection.icon,
                            status = status,
                        ),
                    )
                },
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
