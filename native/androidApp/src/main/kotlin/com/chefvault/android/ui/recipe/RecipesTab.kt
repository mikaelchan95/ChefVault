package com.chefvault.android.ui.recipe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.shared.costing.calculateRecipeCost
import com.chefvault.shared.costing.formatCurrency
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Recipe

@Composable
fun RecipesTab(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "library") {
        composable("library") {
            RecipeLibraryScreen(sdk, onOpen = { id -> nav.navigate("detail/$id") }, onCreate = { nav.navigate("create") })
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
        composable("edit/{id}") { entry ->
            RecipeFormScreen(sdk, recipeId = entry.arguments?.getString("id"), onDone = { nav.popBackStack() })
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecipeLibraryScreen(sdk: ChefVaultSDK, onOpen: (String) -> Unit, onCreate: () -> Unit) {
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }

    val filtered = remember(recipes, query) {
        if (query.isBlank()) recipes
        else recipes.filter {
            it.title.contains(query, ignoreCase = true) || (it.cuisine?.contains(query, ignoreCase = true) == true)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Recipes") },
                actions = { IconButton(onClick = onCreate) { Icon(Icons.Default.Add, contentDescription = "New recipe") } },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search recipes") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
            if (recipes.isEmpty()) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("No recipes yet — tap + to create one", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filtered, key = { it.id }) { recipe ->
                        RecipeRow(recipe) { onOpen(recipe.id) }
                    }
                }
            }
        }
    }
}

@Composable
private fun RecipeRow(recipe: Recipe, onClick: () -> Unit) {
    val costText = remember(recipe.ingredients, recipe.servings) {
        val summary = calculateRecipeCost(recipe.ingredients, recipe.servings)
        if (summary.totalCosted > 0) formatCurrency(summary.totalCosted, "USD") else null
    }
    Surface(onClick = onClick, color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(12.dp)) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Text(recipe.title.take(1).uppercase(), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f)) {
                Text(recipe.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1)
                val meta = buildList {
                    recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
                    add("${recipe.servings} serv")
                    costText?.let { add(it) }
                }.joinToString(" · ")
                Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
