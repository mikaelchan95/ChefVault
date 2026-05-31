package com.chefvault.android.ui.recipe

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.outlined.Restaurant
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.chefvault.android.ui.common.formatQuantity
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlCard
import com.chefvault.android.ui.theme.SlIconButton
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.costing.RecipeCostSummary
import com.chefvault.shared.costing.calculateRecipeCost
import com.chefvault.shared.costing.calculateScaledCost
import com.chefvault.shared.costing.formatCurrency
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.Recipe
import com.chefvault.shared.model.Step
import com.chefvault.shared.scaling.ScaledIngredient
import com.chefvault.shared.scaling.scaleRecipeIngredients
import kotlinx.coroutines.launch

@Composable
fun RecipeDetailScreen(sdk: ChefVaultSDK, recipeId: String, onBack: () -> Unit, onEdit: (String) -> Unit) {
    val sl = LocalSl.current
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val recipe = recipes.firstOrNull { it.id == recipeId }
    val scope = rememberCoroutineScope()
    var servings by remember(recipe?.id) { mutableStateOf(recipe?.servings ?: 1) }
    var system by remember { mutableStateOf(MeasurementSystem.METRIC) }
    var confirmDelete by remember { mutableStateOf(false) }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            BackRow(
                hasRecipe = recipe != null,
                onBack = onBack,
                onShare = {},
                onDelete = { confirmDelete = true },
                onEdit = { recipe?.let { onEdit(it.id) } },
            )
            if (recipe == null) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Outlined.Restaurant, contentDescription = null, tint = sl.accent, modifier = Modifier.size(26.dp))
                        Text("Recipe unavailable", style = slDisplay(19.0, FontWeight.Bold), color = sl.text)
                    }
                }
                return@Column
            }

            val ratio = if (recipe.servings > 0) servings.toDouble() / recipe.servings else 1.0
            val scaled = scaleRecipeIngredients(recipe.ingredients, recipe.servings, servings, system)
            val summary = remember(recipe.ingredients, recipe.servings) {
                calculateRecipeCost(recipe.ingredients, recipe.servings)
            }
            val showCost = summary.costedCount > 0

            Column(
                // extra bottom padding clears the always-present SL tab bar overlay
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp).padding(bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                HeroImage(recipe)
                TitleScaling(recipe, servings, onServings = { servings = it }, system, onSystem = { system = it })
                MetaStrip(recipe, servings)
                DescriptionText(recipe)
                SourceLink(recipe)
                IngredientsSection(scaled, recipe, ratio, showCost)
                if (recipe.steps.isNotEmpty()) MethodSection(recipe.steps)
                if (showCost) CostCard(summary)
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = sl.surface,
            title = { Text("Delete this recipe?", style = slDisplay(17.0, FontWeight.Bold), color = sl.text) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { runCatching { sdk.recipes.delete(recipeId) }; onBack() }
                }) { Text("Delete", color = sl.danger) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel", color = sl.muted) } },
        )
    }
}

@Composable
private fun BackRow(hasRecipe: Boolean, onBack: () -> Unit, onShare: () -> Unit, onDelete: () -> Unit, onEdit: () -> Unit) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 6.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            Modifier.clickable { onBack() },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Recipes", tint = sl.muted, modifier = Modifier.size(20.dp))
            Text("Recipes", style = slBody(14.0, FontWeight.SemiBold), color = sl.muted)
        }
        Box(Modifier.weight(1f))
        if (hasRecipe) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SlIconButton(Icons.Filled.Share) { onShare() }
                SlIconButton(Icons.Filled.Delete) { onDelete() }
                SlIconButton(Icons.Filled.Edit, accent = true) { onEdit() }
            }
        }
    }
}

@Composable
private fun HeroImage(recipe: Recipe) {
    val sl = LocalSl.current
    val img = recipe.imageUrl?.takeIf { it.isNotBlank() } ?: return
    AsyncImage(
        model = img,
        contentDescription = recipe.title,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .fillMaxWidth()
            .height(208.dp)
            .clip(RoundedCornerShape(22.dp))
            .border(1.dp, sl.line, RoundedCornerShape(22.dp)),
    )
}

@Composable
private fun TitleScaling(
    recipe: Recipe,
    servings: Int,
    onServings: (Int) -> Unit,
    system: MeasurementSystem,
    onSystem: (MeasurementSystem) -> Unit,
) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(recipe.title, style = slDisplay(25.0, FontWeight.ExtraBold), color = sl.text)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Stepper(value = servings, onChange = { onServings(it.coerceIn(1, 100)) })
            Text("SERVINGS", style = slMono(10.5).copy(letterSpacing = 1.sp), color = sl.faint)
            Box(Modifier.weight(1f))
            UnitSegmented(system, onSystem, modifier = Modifier.width(150.dp))
        }
    }
}

@Composable
private fun Stepper(value: Int, onChange: (Int) -> Unit) {
    val sl = LocalSl.current
    Row(
        Modifier.clip(RoundedCornerShape(11.dp)).background(sl.surface2).border(1.dp, sl.line2, RoundedCornerShape(11.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(34.dp).clickable { onChange(value - 1) }, contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Remove, contentDescription = "Less", tint = sl.muted, modifier = Modifier.size(16.dp))
        }
        Text("$value", style = slMono(15.0, FontWeight.Bold), color = sl.accent, modifier = Modifier.width(30.dp), textAlign = TextAlign.Center)
        Box(Modifier.size(34.dp).clickable { onChange(value + 1) }, contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Add, contentDescription = "More", tint = sl.muted, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun UnitSegmented(system: MeasurementSystem, onSystem: (MeasurementSystem) -> Unit, modifier: Modifier = Modifier) {
    val sl = LocalSl.current
    Row(
        modifier.clip(RoundedCornerShape(11.dp)).background(sl.surface2).border(1.dp, sl.line, RoundedCornerShape(11.dp)).padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        SegmentButton("Metric", system == MeasurementSystem.METRIC, Modifier.weight(1f)) { onSystem(MeasurementSystem.METRIC) }
        SegmentButton("Imperial", system == MeasurementSystem.IMPERIAL, Modifier.weight(1f)) { onSystem(MeasurementSystem.IMPERIAL) }
    }
}

@Composable
private fun SegmentButton(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val sl = LocalSl.current
    Box(
        modifier.clip(RoundedCornerShape(9.dp)).background(if (active) sl.accent else Color.Transparent).clickable { onClick() }
            .padding(vertical = 7.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = slBody(12.0, FontWeight.SemiBold), color = if (active) sl.onAccent else sl.muted)
    }
}

@Composable
private fun MetaStrip(recipe: Recipe, servings: Int) {
    val sl = LocalSl.current
    val total = (recipe.prepTime ?: 0) + (recipe.cookTime ?: 0)
    val chips = buildList {
        recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
        if (total > 0) add("$total min")
        add("$servings ${if (servings == 1) "serving" else "servings"}")
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        chips.forEach { c ->
            Box(
                Modifier.clip(CircleShape).background(sl.surface).border(1.dp, sl.line, CircleShape)
                    .padding(horizontal = 12.dp, vertical = 7.dp),
            ) {
                Text(c, style = slBody(12.5, FontWeight.Medium), color = sl.muted)
            }
        }
    }
}

@Composable
private fun DescriptionText(recipe: Recipe) {
    val sl = LocalSl.current
    val d = recipe.description?.takeIf { it.isNotBlank() } ?: return
    Text(d, style = slBody(13.5).copy(lineHeight = 19.sp), color = sl.muted)
}

@Composable
private fun SourceLink(recipe: Recipe) {
    val sl = LocalSl.current
    val src = recipe.sourceUrl?.takeIf { it.isNotBlank() } ?: return
    val uriHandler = LocalUriHandler.current
    SlCard(modifier = Modifier.clickable { runCatching { uriHandler.openUri(src) } }) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("View original", style = slBody(12.5, FontWeight.SemiBold), color = sl.accent)
            Box(Modifier.weight(1f))
            Text("↗", style = slBody(13.0, FontWeight.Bold), color = sl.accent)
        }
    }
}

@Composable
private fun CostCard(summary: RecipeCostSummary) {
    val sl = LocalSl.current
    val total = formatCurrency(summary.totalCosted, "USD")
    val perServing = formatCurrency(summary.costPerServing, "USD")
    SlCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                SlKicker("Cost analysis")
                Text(total, style = slMono(24.0, FontWeight.Bold), color = sl.accent)
                Text("$perServing / serving", style = slMono(11.5), color = sl.muted)
            }
            Box(Modifier.clip(CircleShape).background(sl.accentSoft).padding(horizontal = 9.dp, vertical = 5.dp)) {
                Text("${summary.costedCount}/${summary.totalCount} COSTED", style = slMono(10.0, FontWeight.Bold), color = sl.accent)
            }
        }
    }
}

@Composable
private fun IngredientsSection(scaled: List<ScaledIngredient>, recipe: Recipe, ratio: Double, showCost: Boolean) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SlKicker("Ingredients")
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(sl.surface).border(1.dp, sl.line, RoundedCornerShape(12.dp)),
        ) {
            scaled.forEachIndexed { index, item ->
                if (index > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(sl.line))
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.Top) {
                    Row(Modifier.width(96.dp)) {
                        Text(formatQuantity(item.quantity), style = slMono(12.5, FontWeight.Bold), color = sl.accent, maxLines = 1)
                        if (item.unit.isNotEmpty()) {
                            Text(" ${item.unit}", style = slMono(12.5, FontWeight.Bold), color = sl.muted, maxLines = 1)
                        }
                    }
                    val name = if (!item.notes.isNullOrEmpty()) "${item.name} · ${item.notes}" else item.name
                    Text(name, style = slBody(13.5), color = sl.text, modifier = Modifier.weight(1f))
                    if (showCost) {
                        val cost = calculateScaledCost(recipe.ingredients[index].costPerUnit, recipe.ingredients[index].quantity * ratio)
                        Text(
                            if (cost != null) formatCurrency(cost, "USD") else "—",
                            style = slMono(11.5),
                            color = if (cost == null) sl.faint else sl.text,
                            modifier = Modifier.width(54.dp),
                            textAlign = TextAlign.End,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MethodSection(steps: List<Step>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SlKicker("Method")
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            steps.forEachIndexed { index, step -> StepRow(index + 1, step) }
        }
    }
}

@Composable
private fun StepRow(number: Int, step: Step) {
    val sl = LocalSl.current
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(26.dp).clip(CircleShape).background(sl.accent), contentAlignment = Alignment.Center) {
            Text("$number", style = slMono(12.5, FontWeight.Bold), color = sl.onAccent)
        }
        Column(Modifier.weight(1f).padding(top = 1.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(step.instruction, style = slBody(14.0).copy(lineHeight = 20.sp), color = sl.text)
            val timer = step.timerSeconds ?: 0
            if (timer > 0) {
                Box(Modifier.clip(CircleShape).border(1.dp, sl.accent.copy(alpha = 0.35f), CircleShape).padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Text("⏱ ${timer / 60}:${(timer % 60).toString().padStart(2, '0')}", style = slMono(11.0), color = sl.accent)
                }
            }
        }
    }
}
