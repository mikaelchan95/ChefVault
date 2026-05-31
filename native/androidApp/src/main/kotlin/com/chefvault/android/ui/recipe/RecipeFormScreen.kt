@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.chefvault.android.ui.recipe

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.formatQuantity
import com.chefvault.android.ui.common.uploadPickedImage
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlChip
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlVariant
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.costing.formatCurrency
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewIngredient
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.NewStep
import com.chefvault.shared.data.repository.StorageBucket
import com.chefvault.shared.model.CUISINES
import com.chefvault.shared.model.UNITS
import kotlinx.coroutines.launch

private data class DraftIngredient(val name: String = "", val quantity: String = "", val unit: String = "g", val cost: String = "")
private data class DraftStep(val instruction: String = "", val timer: String = "")

/** Banner shown above an imported draft, listing any parse warnings. */
@Composable
private fun ImportWarningsBanner(warnings: List<String>) {
    val sl = LocalSl.current
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(sl.accentSoft).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        SlKicker("Imported — please check", color = sl.accent)
        warnings.forEach { Text("• $it", style = slBody(12.0), color = sl.muted) }
    }
}

@Composable
fun RecipeFormScreen(
    sdk: ChefVaultSDK,
    recipeId: String?,
    onDone: () -> Unit,
    draft: NewRecipe? = null,
    importWarnings: List<String> = emptyList(),
) {
    val sl = LocalSl.current
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val existing = recipeId?.let { id -> recipes.firstOrNull { it.id == id } }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // Imported recipes carry their original link through to save (source_url).
    val sourceUrl = existing?.sourceUrl ?: draft?.sourceUrl

    var title by remember { mutableStateOf(existing?.title ?: draft?.title ?: "") }
    var cuisine by remember { mutableStateOf(existing?.cuisine ?: draft?.cuisine ?: "") }
    var servings by remember { mutableStateOf((existing?.servings ?: draft?.servings ?: 4).toString()) }
    var prep by remember { mutableStateOf((existing?.prepTime ?: draft?.prepTime)?.toString() ?: "") }
    var cook by remember { mutableStateOf((existing?.cookTime ?: draft?.cookTime)?.toString() ?: "") }
    var description by remember { mutableStateOf(existing?.description ?: draft?.description ?: "") }
    val photos = remember { mutableStateListOf<String>().apply { (existing?.platingPhotos ?: draft?.platingPhotos)?.let { addAll(it) } } }
    val ingredients = remember {
        mutableStateListOf<DraftIngredient>().apply {
            existing?.ingredients?.forEach { add(DraftIngredient(it.name, formatQuantity(it.quantity), it.unit, it.costPerUnit?.let { c -> formatQuantity(c) } ?: "")) }
            if (isEmpty()) draft?.ingredients?.forEach { add(DraftIngredient(it.name, formatQuantity(it.quantity), it.unit, it.costPerUnit?.let { c -> formatQuantity(c) } ?: "")) }
            if (isEmpty()) add(DraftIngredient())
        }
    }
    val steps = remember {
        mutableStateListOf<DraftStep>().apply {
            existing?.steps?.forEach { add(DraftStep(it.instruction, it.timerSeconds?.let { s -> (s / 60).toString() } ?: "")) }
            if (isEmpty()) draft?.steps?.forEach { add(DraftStep(it.instruction, it.timerSeconds?.let { s -> (s / 60).toString() } ?: "")) }
            if (isEmpty()) add(DraftStep())
        }
    }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var uploading by remember { mutableStateOf(false) }

    val runningTotal = ingredients.sumOf { (it.cost.toDoubleOrNull() ?: 0.0) * (it.quantity.toDoubleOrNull() ?: 0.0) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            runCatching { uploadPickedImage(context, uri, sdk.storage, StorageBucket.RECIPE_IMAGES)?.let { photos.add(it) } }
            uploading = false
        }
    }

    fun save() {
        busy = true
        error = null
        scope.launch {
            val form = NewRecipe(
                title = title,
                cuisine = cuisine.ifBlank { null },
                servings = servings.toIntOrNull() ?: 1,
                prepTime = prep.toIntOrNull(),
                cookTime = cook.toIntOrNull(),
                description = description.ifBlank { null },
                imageUrl = photos.firstOrNull(),
                platingPhotos = photos.toList(),
                sourceUrl = sourceUrl,
                ingredients = ingredients.filter { it.name.isNotBlank() }
                    .map { NewIngredient(it.name, it.quantity.toDoubleOrNull() ?: 0.0, it.unit, null, it.cost.toDoubleOrNull()) },
                steps = steps.filter { it.instruction.isNotBlank() }
                    .map { NewStep(it.instruction, it.timer.toIntOrNull()?.let { m -> m * 60 }) },
            )
            try {
                if (existing != null) sdk.recipes.update(existing.id, form) else sdk.recipes.addRecipe(form)
                onDone()
            } catch (e: Exception) {
                val msg = e.message ?: "Save failed"
                error = if (msg.contains("limit") || msg.contains("50")) "Free plan limit reached (50 recipes)." else msg
            } finally {
                busy = false
            }
        }
    }

    val canSave = title.isNotBlank() && !busy

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            // Modal-style header: Cancel / title / Save accent
            Column {
                Box(Modifier.fillMaxWidth().padding(top = 8.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(width = 38.dp, height = 5.dp).clip(CircleShape).background(sl.line2))
                }
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Cancel", style = slBody(14.0), color = sl.muted, modifier = Modifier.clickable { onDone() })
                    Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        Text(if (existing == null) "New Recipe" else "Edit Recipe", style = slDisplay(16.0, FontWeight.Bold), color = sl.text)
                    }
                    Text(
                        if (busy) "Saving…" else "Save",
                        style = slBody(14.0, FontWeight.Bold),
                        color = if (canSave) sl.accent else sl.accent.copy(alpha = 0.4f),
                        modifier = Modifier.then(if (canSave) Modifier.clickable { save() } else Modifier),
                    )
                }
                SlDivider()
            }

            LazyColumn(
                // bottom clears the always-present SL tab bar overlay
                contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 18.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                if (importWarnings.isNotEmpty()) {
                    item { ImportWarningsBanner(importWarnings) }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        SlKicker("Title")
                        FormField(title, { title = it }, "Recipe title", style = slBody(15.0, FontWeight.SemiBold))
                    }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        SlKicker("Cuisine")
                        FlowChips(CUISINES, selected = cuisine) { opt -> cuisine = if (cuisine == opt) "" else opt }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        MonoField("Servings", servings, { servings = it.filter(Char::isDigit) }, Modifier.weight(1f))
                        MonoField("Prep", prep, { prep = it.filter(Char::isDigit) }, Modifier.weight(1f))
                        MonoField("Cook", cook, { cook = it.filter(Char::isDigit) }, Modifier.weight(1f))
                    }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        SlKicker("Notes")
                        FormField(description, { description = it }, "Description or notes (optional)", singleLine = false, minHeight = 60)
                    }
                }
                item { SlDivider() }
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        SlKicker("Ingredients")
                        Box(Modifier.weight(1f))
                        Text("${formatCurrency(runningTotal, "USD")} running", style = slMono(10.5, FontWeight.Bold), color = sl.accent)
                    }
                }
                itemsIndexed(ingredients, key = { i, _ -> "ing-$i" }) { i, ing ->
                    IngredientInput(
                        ing,
                        onChange = { ingredients[i] = it },
                        onDelete = { if (i in ingredients.indices) ingredients.removeAt(i) },
                    )
                }
                item {
                    SlButton("Add ingredient", variant = SlVariant.Secondary, modifier = Modifier.fillMaxWidth()) { ingredients.add(DraftIngredient()) }
                }
                item { SlDivider() }
                item { SlKicker("Method") }
                itemsIndexed(steps, key = { i, _ -> "step-$i" }) { i, step ->
                    StepInput(
                        number = i + 1,
                        step = step,
                        onChange = { steps[i] = it },
                        onDelete = { if (i in steps.indices) steps.removeAt(i) },
                    )
                }
                item {
                    SlButton("Add step", variant = SlVariant.Secondary, modifier = Modifier.fillMaxWidth()) { steps.add(DraftStep()) }
                }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        SlKicker("Plating · ${photos.size}")
                        SlButton(if (uploading) "Uploading…" else "Add photo", variant = SlVariant.Secondary, enabled = !uploading, modifier = Modifier.fillMaxWidth()) {
                            picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        }
                    }
                }
                error?.let { msg ->
                    item { Text(msg, style = slBody(12.5), color = sl.danger) }
                }
            }
        }
    }
}

/** Borderless mono field on a surface tile — used for title/ingredient/step text inputs. */
@Composable
private fun FormField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    style: TextStyle = slBody(13.5),
    keyboard: KeyboardType = KeyboardType.Text,
    singleLine: Boolean = true,
    minHeight: Int = 44,
) {
    val sl = LocalSl.current
    Box(
        modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(sl.surface).border(1.dp, sl.line2, RoundedCornerShape(10.dp))
            .heightIn(min = minHeight.dp).padding(horizontal = 13.dp, vertical = 12.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = singleLine,
            textStyle = style.copy(color = sl.text),
            cursorBrush = SolidColor(sl.accent),
            keyboardOptions = KeyboardOptions(keyboardType = keyboard),
            modifier = Modifier.fillMaxWidth(),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, style = style, color = sl.faint)
                inner()
            },
        )
    }
}

/** Center-aligned ember mono numeric field with a kicker, for servings/prep/cook. */
@Composable
private fun MonoField(kicker: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val sl = LocalSl.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        SlKicker(kicker)
        Box(
            Modifier.fillMaxWidth().height(42.dp).clip(RoundedCornerShape(10.dp)).background(sl.surface).border(1.dp, sl.line2, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = slMono(15.0, FontWeight.Bold).copy(color = sl.accent, textAlign = TextAlign.Center),
                cursorBrush = SolidColor(sl.accent),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/** Wrapping row of selectable cuisine chips. */
@Composable
private fun FlowChips(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp),
    ) {
        options.forEach { opt ->
            SlChip(label = opt, active = selected == opt) { onSelect(opt) }
        }
    }
}

/** One ingredient draft: mono qty box, unit cycler box, flexible name field, delete. */
@Composable
private fun IngredientInput(ingredient: DraftIngredient, onChange: (DraftIngredient) -> Unit, onDelete: () -> Unit) {
    val sl = LocalSl.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.width(48.dp).height(40.dp).clip(RoundedCornerShape(10.dp)).background(sl.surface).border(1.dp, sl.line2, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            BasicTextField(
                value = ingredient.quantity,
                onValueChange = { onChange(ingredient.copy(quantity = it)) },
                singleLine = true,
                textStyle = slMono(13.0, FontWeight.Bold).copy(color = sl.accent, textAlign = TextAlign.Center),
                cursorBrush = SolidColor(sl.accent),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                decorationBox = { inner ->
                    if (ingredient.quantity.isEmpty()) Text("0", style = slMono(13.0, FontWeight.Bold).copy(textAlign = TextAlign.Center), color = sl.faint, modifier = Modifier.fillMaxWidth())
                    inner()
                },
            )
        }
        // unit cycler — taps advance through the shared UNITS list
        Box(
            Modifier.width(54.dp).height(40.dp).clip(RoundedCornerShape(10.dp)).background(sl.surface).border(1.dp, sl.line2, RoundedCornerShape(10.dp))
                .clickable {
                    val next = (UNITS.indexOf(ingredient.unit).coerceAtLeast(0) + 1) % UNITS.size
                    onChange(ingredient.copy(unit = UNITS[next]))
                },
            contentAlignment = Alignment.Center,
        ) {
            Text(ingredient.unit, style = slBody(12.0, FontWeight.SemiBold), color = sl.muted)
        }
        FormField(
            ingredient.name,
            { onChange(ingredient.copy(name = it)) },
            "Ingredient",
            modifier = Modifier.weight(1f),
            minHeight = 40,
        )
        Box(Modifier.size(width = 28.dp, height = 40.dp).clickable { onDelete() }, contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Close, contentDescription = "Remove", tint = sl.faint, modifier = Modifier.size(16.dp))
        }
    }
}

/** One method step: ember number circle + multiline instruction box + delete. */
@Composable
private fun StepInput(number: Int, step: DraftStep, onChange: (DraftStep) -> Unit, onDelete: () -> Unit) {
    val sl = LocalSl.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(28.dp).clip(CircleShape).background(sl.accent), contentAlignment = Alignment.Center) {
            Text("$number", style = slMono(12.0, FontWeight.Bold), color = sl.onAccent)
        }
        FormField(
            step.instruction,
            { onChange(step.copy(instruction = it)) },
            "Describe this step…",
            modifier = Modifier.weight(1f),
            singleLine = false,
            minHeight = 56,
        )
        Box(Modifier.size(28.dp).clickable { onDelete() }, contentAlignment = Alignment.Center) {
            Icon(Icons.Filled.Close, contentDescription = "Remove", tint = sl.faint, modifier = Modifier.size(16.dp))
        }
    }
}
