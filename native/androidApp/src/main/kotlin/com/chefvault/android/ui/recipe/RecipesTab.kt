package com.chefvault.android.ui.recipe

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlAppBar
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlCard
import com.chefvault.android.ui.theme.SlChip
import com.chefvault.android.ui.theme.SlFab
import com.chefvault.android.ui.theme.SlIconButton
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSearchField
import com.chefvault.android.ui.theme.SlTile
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.costing.calculateRecipeCost
import com.chefvault.shared.costing.formatCurrency
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Recipe

@Composable
fun RecipesTab(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "library") {
        composable("library") {
            RecipeLibraryScreen(
                sdk,
                onOpen = { id -> nav.navigate("detail/$id") },
                onCreate = { nav.navigate("create") },
                onImport = { nav.navigate("import") },
            )
        }
        composable("detail/{id}") { entry ->
            RecipeDetailScreen(
                sdk,
                recipeId = entry.arguments?.getString("id").orEmpty(),
                onBack = { nav.popBackStack() },
                onEdit = { id -> nav.navigate("edit/$id") },
            )
        }
        composable("create") { RecipeFormScreen(sdk, recipeId = null, onDone = { nav.popBackStack() }) }
        composable("import") { RecipeImportScreen(sdk, onDone = { nav.popBackStack() }) }
        composable("edit/{id}") { entry ->
            RecipeFormScreen(sdk, recipeId = entry.arguments?.getString("id"), onDone = { nav.popBackStack() })
        }
    }
}

@Composable
private fun RecipeLibraryScreen(sdk: ChefVaultSDK, onOpen: (String) -> Unit, onCreate: () -> Unit, onImport: () -> Unit) {
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    var cuisine by remember { mutableStateOf<String?>(null) }
    var sortBy by remember { mutableStateOf(RecipeSort.UPDATED) }
    var showSort by remember { mutableStateOf(false) }

    val cuisines = remember(recipes) {
        recipes.mapNotNull { it.cuisine?.takeIf { c -> c.isNotBlank() } }.distinct().sorted()
    }
    val filtered = remember(recipes, query, cuisine, sortBy) {
        val base = recipes.filter { r ->
            (cuisine == null || r.cuisine == cuisine) &&
                (query.isBlank() ||
                    r.title.contains(query, ignoreCase = true) ||
                    (r.cuisine?.contains(query, ignoreCase = true) == true))
        }
        when (sortBy) {
            RecipeSort.UPDATED -> base.sortedByDescending { parseInstant(it.updatedAt) ?: java.time.Instant.MIN }
            RecipeSort.NAME -> base.sortedBy { it.title.lowercase() }
            RecipeSort.COST -> base.sortedByDescending { calculateRecipeCost(it.ingredients, it.servings).totalCosted }
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlAppBar(title = "Recipes", kicker = "Mise en place", count = "${recipes.size}") {
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlIconButton(Icons.Filled.Link) { onImport() }
                    SlIconButton(Icons.Filled.Tune, accent = sortBy != RecipeSort.UPDATED) { showSort = true }
                }
            }
            LazyColumn(
                contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 4.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SlSearchField(value = query, onValueChange = { query = it })
                        Row(
                            Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            SlChip(label = "All", active = cuisine == null) { cuisine = null }
                            cuisines.forEach { c ->
                                SlChip(label = c, active = cuisine == c) { cuisine = if (cuisine == c) null else c }
                            }
                        }
                    }
                }
                if (recipes.isEmpty()) {
                    item { EmptyState() }
                } else {
                    items(filtered, key = { it.id }) { recipe ->
                        SlRecipeRow(recipe) { onOpen(recipe.id) }
                    }
                }
            }
        }
        // SlBackground gives a BoxScope; float the create button above the SL tab bar.
        Box(Modifier.align(Alignment.BottomEnd).padding(end = 18.dp, bottom = 88.dp)) {
            SlFab(onClick = onCreate)
        }
    }
    if (showSort) {
        SortSheet(current = sortBy, onPick = { sortBy = it; showSort = false }, onDismiss = { showSort = false })
    }
}

@Composable
private fun EmptyState() {
    val sl = LocalSl.current
    Column(
        Modifier.fillMaxWidth().padding(top = 60.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            Modifier.size(70.dp).clip(RoundedCornerShape(18.dp)).border(2.dp, sl.line2, RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Restaurant, contentDescription = null, tint = sl.accent, modifier = Modifier.size(26.dp))
        }
        Text("No recipes yet", style = slDisplay(19.0, FontWeight.Bold), color = sl.text)
        Text("Tap + to create your first recipe", style = slBody(13.0), color = sl.muted)
    }
}

/** Library card row — color-hashed tile, title, meta line, ember cost + updated stamp. */
@Composable
private fun SlRecipeRow(recipe: Recipe, onClick: () -> Unit) {
    val sl = LocalSl.current
    val tone = remember(recipe.title) { recipe.title.sumOf { it.code } % 4 }
    val costText = remember(recipe.ingredients, recipe.servings) {
        val s = calculateRecipeCost(recipe.ingredients, recipe.servings)
        if (s.totalCosted > 0) formatCurrency(s.totalCosted, "USD") else null
    }
    val meta = remember(recipe) {
        buildList {
            recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
            add("${recipe.servings} servings")
            val cook = recipe.cookTime ?: 0
            val prep = recipe.prepTime ?: 0
            if (cook > 0) add("$cook min") else if (prep > 0) add("$prep min")
        }.joinToString(" · ")
    }
    val upd = remember(recipe.updatedAt) { shortRelative(recipe.updatedAt) }

    SlCard(modifier = Modifier.clickable { onClick() }, padding = 11) {
        Row(horizontalArrangement = Arrangement.spacedBy(13.dp), verticalAlignment = Alignment.CenterVertically) {
            val img = recipe.imageUrl?.takeIf { it.isNotBlank() }
            if (img != null) {
                AsyncImage(
                    model = img,
                    contentDescription = recipe.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(60.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, sl.line2, RoundedCornerShape(14.dp)),
                )
            } else {
                SlTile(letter = recipe.title.take(1).uppercase(), tone = tone, sizeDp = 60)
            }
            Column(verticalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.weight(1f)) {
                Text(recipe.title, style = slDisplay(15.5, FontWeight.Bold), color = sl.text, maxLines = 2)
                Text(meta, style = slBody(11.5), color = sl.muted, maxLines = 1)
                Row(Modifier.fillMaxWidth().padding(top = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (costText != null) {
                        Text(costText, style = slMono(14.0, FontWeight.Bold), color = sl.accent)
                    }
                    Box(Modifier.weight(1f))
                    if (upd != null) {
                        Text("UPD $upd", style = slMono(10.0), color = sl.faint)
                    }
                }
            }
        }
    }
}

private enum class RecipeSort(val label: String) {
    UPDATED("Recently updated"),
    NAME("Name A–Z"),
    COST("Highest cost"),
}

/** Parses an ISO-8601 timestamp (instant or offset form); null if unparseable. */
private fun parseInstant(iso: String): java.time.Instant? =
    runCatching { java.time.Instant.parse(iso) }
        .recoverCatching { java.time.OffsetDateTime.parse(iso).toInstant() }
        .getOrNull()

/** Best-effort "2d" / "3h" / "now" from an ISO-8601 timestamp; null if unparseable. */
private fun shortRelative(iso: String): String? {
    val instant = parseInstant(iso) ?: return null
    val seconds = (java.time.Duration.between(instant, java.time.Instant.now()).seconds).coerceAtLeast(0)
    return when {
        seconds < 3600 -> "now"
        seconds < 86_400 -> "${seconds / 3600}h"
        else -> "${seconds / 86_400}d"
    }
}

/** Service Line sort picker — mirrors the iOS sort sheet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SortSheet(current: RecipeSort, onPick: (RecipeSort) -> Unit, onDismiss: () -> Unit) {
    val sl = LocalSl.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = sl.bg) {
        Column(Modifier.fillMaxWidth().padding(bottom = 32.dp)) {
            SlKicker("Sort by", modifier = Modifier.padding(horizontal = 18.dp, vertical = 6.dp))
            RecipeSort.entries.forEach { opt ->
                Row(
                    Modifier.fillMaxWidth().clickable { onPick(opt) }.padding(horizontal = 18.dp, vertical = 15.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        opt.label,
                        style = slBody(15.5, if (opt == current) FontWeight.SemiBold else FontWeight.Normal),
                        color = if (opt == current) sl.text else sl.muted,
                    )
                    Box(Modifier.weight(1f))
                    if (opt == current) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = sl.accent, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}
