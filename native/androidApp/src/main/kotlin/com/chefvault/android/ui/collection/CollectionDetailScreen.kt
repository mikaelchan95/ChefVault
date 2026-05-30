package com.chefvault.android.ui.collection

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlCard
import com.chefvault.android.ui.theme.SlChip
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSearchField
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.SlTile
import com.chefvault.android.ui.theme.SlVariant
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewCollection
import com.chefvault.shared.model.Collection
import com.chefvault.shared.model.CollectionStatus
import com.chefvault.shared.model.Recipe
import kotlinx.coroutines.launch

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

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            BackRow(
                hasCollection = collection != null,
                menuOpen = menuOpen,
                onBack = onBack,
                onMenu = { menuOpen = it },
                onEdit = { menuOpen = false; showEdit = true },
                onDelete = { menuOpen = false; confirmDelete = true },
            )

            if (collection == null) {
                val sl = LocalSl.current
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Collection unavailable", style = slDisplay(19.0, FontWeight.Bold), color = sl.text)
                    }
                }
                return@Column
            }

            val members = remember(recipes, collection.recipeIds) {
                recipes.filter { it.id in collection.recipeIds }
            }

            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Hero(collection)
                Column(
                    Modifier.fillMaxWidth().padding(18.dp).padding(bottom = 22.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                ) {
                    StatsRow(collection)
                    SlButton(label = "Manage Recipes", variant = SlVariant.Secondary, modifier = Modifier.fillMaxWidth()) {
                        showAddSheet = true
                    }
                    RecipesSection(members)
                    Footnote()
                }
            }
        }
    }

    if (showAddSheet && collection != null) {
        AddRecipesSheet(
            recipes = recipes,
            memberIds = collection.recipeIds,
            onDismiss = { showAddSheet = false },
            onToggle = { recipe, inCollection ->
                scope.launch {
                    runCatching {
                        if (inCollection) sdk.collections.removeRecipe(collection.id, recipe.id)
                        else sdk.collections.addRecipe(collection.id, recipe.id)
                    }
                }
            },
        )
    }

    if (showEdit && collection != null) {
        EditCollectionSheet(
            collection = collection,
            onDismiss = { showEdit = false },
            onSave = { form ->
                showEdit = false
                scope.launch { runCatching { sdk.collections.update(collection.id, form) } }
            },
        )
    }

    if (confirmDelete && collection != null) {
        val sl = LocalSl.current
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = sl.surface,
            title = { Text("Delete this collection?", style = slDisplay(17.0, FontWeight.Bold), color = sl.text) },
            text = { Text("Recipes inside it are not deleted.", style = slBody(13.0), color = sl.muted) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { runCatching { sdk.collections.delete(collection.id) }; onBack() }
                }) { Text("Delete", style = slBody(14.0, FontWeight.Bold), color = sl.danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Cancel", style = slBody(14.0), color = sl.muted) }
            },
        )
    }
}

@Composable
private fun BackRow(
    hasCollection: Boolean,
    menuOpen: Boolean,
    onBack: () -> Unit,
    onMenu: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 6.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            Modifier.clickable { onBack() },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Collections", tint = sl.muted, modifier = Modifier.size(20.dp))
            Text("Collections", style = slBody(14.0, FontWeight.SemiBold), color = sl.muted)
        }
        Box(Modifier.weight(1f))
        if (hasCollection) {
            Box {
                Box(
                    Modifier.size(38.dp).clip(RoundedCornerShape(12.dp))
                        .background(sl.surface)
                        .border(1.dp, sl.line2, RoundedCornerShape(12.dp))
                        .clickable { onMenu(true) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.MoreVert, contentDescription = "More", tint = sl.text, modifier = Modifier.size(18.dp))
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { onMenu(false) }) {
                    DropdownMenuItem(text = { Text("Edit") }, onClick = onEdit)
                    DropdownMenuItem(text = { Text("Delete") }, onClick = onDelete)
                }
            }
        }
    }
}

@Composable
private fun Hero(collection: Collection) {
    val sl = LocalSl.current
    val count = collection.recipeIds.size
    val statusLabel = if (collection.status == CollectionStatus.ACTIVE) "active" else "draft"
    Box {
        Box(
            Modifier
                .fillMaxWidth()
                .height(140.dp)
                .background(collectionToneBrush(collection.id)),
            contentAlignment = Alignment.BottomStart,
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(collection.name, style = slDisplay(24.0, FontWeight.ExtraBold), color = sl.text)
                Text(
                    "$count ${if (count == 1) "recipe" else "recipes"} · $statusLabel",
                    style = slMono(11.5),
                    color = sl.muted,
                )
            }
        }
        SlDivider()
    }
}

@Composable
private fun StatsRow(collection: Collection) {
    SlCard(soft = true) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            StatItem("Recipes", collection.recipeIds.size.toString())
            StatItem("Status", if (collection.status == CollectionStatus.ACTIVE) "Active" else "Draft")
            StatItem("Created", collection.createdAt.take(10))
        }
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SlKicker(label)
        Text(value, style = slDisplay(16.0, FontWeight.Bold), color = sl.text, maxLines = 1)
    }
}

@Composable
private fun RecipesSection(members: List<Recipe>) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SlKicker("Recipes")
        if (members.isEmpty()) {
            SlCard(soft = true) {
                Column(
                    Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text("No recipes yet", style = slDisplay(15.0, FontWeight.Bold), color = sl.text)
                    Text("Tap Manage Recipes to add some.", style = slBody(12.5), color = sl.muted)
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
                members.forEach { recipe -> MemberRow(recipe) }
            }
        }
    }
}

@Composable
private fun MemberRow(recipe: Recipe) {
    val sl = LocalSl.current
    SlCard(padding = 10) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SlTile(letter = recipe.title.take(1).uppercase(), tone = collectionTone(recipe.title), sizeDp = 46)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(recipe.title, style = slDisplay(13.5, FontWeight.Bold), color = sl.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val meta = buildList {
                    recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
                    add("${recipe.servings} serv")
                }.joinToString(" · ")
                Text(meta, style = slMono(11.0), color = sl.muted)
            }
        }
    }
}

@Composable
private fun Footnote() {
    Text(
        "Recipes are many-to-many — one recipe can live in several collections.",
        style = slBody(11.5),
        color = LocalSl.current.faint,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddRecipesSheet(
    recipes: List<Recipe>,
    memberIds: List<String>,
    onDismiss: () -> Unit,
    onToggle: (Recipe, Boolean) -> Unit,
) {
    val sl = LocalSl.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var query by remember { mutableStateOf("") }
    // Local mirror so taps reflect instantly while the shared StateFlow propagates back.
    var selected by remember { mutableStateOf(memberIds.toSet()) }

    val filtered = remember(recipes, query) {
        if (query.isBlank()) recipes
        else recipes.filter { it.title.contains(query, ignoreCase = true) }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = sl.bg) {
        Text(
            "Manage Recipes",
            style = slDisplay(16.0, FontWeight.Bold),
            color = sl.text,
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        if (recipes.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("No recipes", style = slDisplay(18.0, FontWeight.Bold), color = sl.text)
                    Text("Create recipes first to add them here", style = slBody(12.5), color = sl.muted)
                }
            }
        } else {
            Column(Modifier.padding(horizontal = 18.dp).padding(bottom = 8.dp)) {
                SlSearchField(value = query, onValueChange = { query = it })
            }
            LazyColumn(Modifier.padding(horizontal = 18.dp).padding(bottom = 32.dp)) {
                items(filtered, key = { it.id }) { recipe ->
                    val inCollection = recipe.id in selected
                    RecipeToggleRow(recipe, inCollection) {
                        onToggle(recipe, inCollection)
                        selected = if (inCollection) selected - recipe.id else selected + recipe.id
                    }
                }
            }
        }
    }
}

@Composable
private fun RecipeToggleRow(recipe: Recipe, isMember: Boolean, onToggle: () -> Unit) {
    val sl = LocalSl.current
    Column {
        Row(
            Modifier.fillMaxWidth().clickable { onToggle() }.padding(vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SlTile(letter = recipe.title.take(1).uppercase(), tone = collectionTone(recipe.title), sizeDp = 42)
            Text(recipe.title, style = slDisplay(13.5, FontWeight.Bold), color = sl.text, modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
            Box(
                Modifier.size(28.dp).clip(CircleShape)
                    .background(if (isMember) sl.accent else Color.Transparent)
                    .border(1.5.dp, if (isMember) sl.accent else sl.line2, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (isMember) Icons.Filled.Check else Icons.Filled.Add,
                    contentDescription = null,
                    tint = if (isMember) sl.onAccent else sl.muted,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
        SlDivider()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditCollectionSheet(collection: Collection, onDismiss: () -> Unit, onSave: (NewCollection) -> Unit) {
    val sl = LocalSl.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember { mutableStateOf(collection.name) }
    var description by remember { mutableStateOf(collection.description ?: "") }
    var status by remember { mutableStateOf(collection.status) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = sl.bg) {
        Text(
            "Edit Collection",
            style = slDisplay(16.0, FontWeight.Bold),
            color = sl.text,
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 18.dp).padding(bottom = 32.dp),
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
            SlDivider()
            SlButton(
                label = "Save Changes",
                modifier = Modifier.fillMaxWidth(),
                enabled = name.isNotBlank(),
            ) {
                onSave(
                    NewCollection(
                        name = name,
                        description = description.ifBlank { null },
                        color = collection.color,
                        icon = collection.icon,
                        status = status,
                    ),
                )
            }
            Text(
                "Recipes themselves are never deleted.",
                style = slBody(11.0),
                color = sl.faint,
                modifier = Modifier.fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

/** Two-pill segmented control (SlChip-equiv) for Active/Draft. */
@Composable
fun StatusSegmented(status: CollectionStatus, onChange: (CollectionStatus) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        SlChip("Active", active = status == CollectionStatus.ACTIVE) { onChange(CollectionStatus.ACTIVE) }
        SlChip("Draft", active = status == CollectionStatus.DRAFT) { onChange(CollectionStatus.DRAFT) }
    }
}
