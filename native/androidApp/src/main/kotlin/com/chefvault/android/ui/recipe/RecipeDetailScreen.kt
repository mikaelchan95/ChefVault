package com.chefvault.android.ui.recipe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.android.ui.common.formatQuantity
import com.chefvault.shared.costing.calculateRecipeCost
import com.chefvault.shared.costing.calculateScaledCost
import com.chefvault.shared.costing.formatCurrency
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.scaling.scaleRecipeIngredients
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeDetailScreen(sdk: ChefVaultSDK, recipeId: String, onBack: () -> Unit, onEdit: (String) -> Unit) {
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val recipe = recipes.firstOrNull { it.id == recipeId }
    val scope = rememberCoroutineScope()
    var servings by remember(recipe?.id) { mutableStateOf(recipe?.servings ?: 1) }
    var system by remember { mutableStateOf(MeasurementSystem.METRIC) }
    var confirmDelete by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(recipe?.title ?: "Recipe") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    if (recipe != null) {
                        IconButton(onClick = { onEdit(recipe.id) }) { Icon(Icons.Default.Edit, "Edit") }
                        IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Default.Delete, "Delete") }
                    }
                },
            )
        },
    ) { padding ->
        if (recipe == null) {
            Column(Modifier.fillMaxSize().padding(padding), horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.size(48.dp)); Text("Recipe unavailable", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }
        val ratio = if (recipe.servings > 0) servings.toDouble() / recipe.servings else 1.0
        val scaled = scaleRecipeIngredients(recipe.ingredients, recipe.servings, servings, system)
        val summary = calculateRecipeCost(recipe.ingredients, recipe.servings)

        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            recipe.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            CvCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Servings", style = MaterialTheme.typography.titleMedium)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FilledIconButton(onClick = { if (servings > 1) servings-- }) { Icon(Icons.Default.Remove, "Less") }
                        Text("$servings", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        FilledIconButton(onClick = { if (servings < 100) servings++ }) { Icon(Icons.Default.Add, "More") }
                    }
                }
            }

            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(selected = system == MeasurementSystem.METRIC, onClick = { system = MeasurementSystem.METRIC }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Metric") }
                SegmentedButton(selected = system == MeasurementSystem.IMPERIAL, onClick = { system = MeasurementSystem.IMPERIAL }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Imperial") }
            }

            CvCard {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionHeader("Ingredients")
                    scaled.forEachIndexed { index, item ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("${formatQuantity(item.quantity)} ${item.unit}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.size(width = 96.dp, height = 20.dp))
                            Text(item.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                            calculateScaledCost(recipe.ingredients[index].costPerUnit, recipe.ingredients[index].quantity * ratio)?.let {
                                Text(formatCurrency(it, "USD"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        if (index < scaled.size - 1) Divider()
                    }
                }
            }

            if (summary.totalCosted > 0) {
                CvCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionHeader(if (summary.isComplete) "Cost Analysis" else "Cost Analysis (partial)")
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            CostMetric("Total", formatCurrency(summary.totalCosted, "USD"))
                            CostMetric("Per Serving", formatCurrency(summary.costPerServing, "USD"))
                        }
                    }
                }
            }

            if (recipe.steps.isNotEmpty()) {
                CvCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SectionHeader("Method")
                        recipe.steps.forEachIndexed { index, step ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("${index + 1}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                Text(step.instruction, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this recipe?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { runCatching { sdk.recipes.delete(recipeId) }; onBack() }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun CostMetric(label: String, value: String) {
    Column {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
    }
}
