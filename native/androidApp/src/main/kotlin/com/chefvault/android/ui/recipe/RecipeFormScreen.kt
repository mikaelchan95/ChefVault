package com.chefvault.android.ui.recipe

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewIngredient
import com.chefvault.shared.data.repository.NewRecipe
import com.chefvault.shared.data.repository.NewStep
import com.chefvault.shared.data.repository.StorageBucket
import java.util.UUID
import kotlinx.coroutines.launch

private data class DraftIngredient(val name: String = "", val quantity: String = "", val unit: String = "g", val cost: String = "")
private data class DraftStep(val instruction: String = "", val timer: String = "")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipeFormScreen(sdk: ChefVaultSDK, recipeId: String?, onDone: () -> Unit) {
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val existing = recipeId?.let { id -> recipes.firstOrNull { it.id == id } }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var title by remember { mutableStateOf(existing?.title ?: "") }
    var cuisine by remember { mutableStateOf(existing?.cuisine ?: "") }
    var servings by remember { mutableStateOf((existing?.servings ?: 4).toString()) }
    var prep by remember { mutableStateOf(existing?.prepTime?.toString() ?: "") }
    var cook by remember { mutableStateOf(existing?.cookTime?.toString() ?: "") }
    var description by remember { mutableStateOf(existing?.description ?: "") }
    val photos = remember { mutableStateListOf<String>().apply { existing?.platingPhotos?.let { addAll(it) } } }
    val ingredients = remember {
        mutableStateListOf<DraftIngredient>().apply {
            existing?.ingredients?.forEach { add(DraftIngredient(it.name, formatQty(it.quantity), it.unit, it.costPerUnit?.toString() ?: "")) }
            if (isEmpty()) add(DraftIngredient())
        }
    }
    val steps = remember {
        mutableStateListOf<DraftStep>().apply {
            existing?.steps?.forEach { add(DraftStep(it.instruction, it.timerSeconds?.let { s -> (s / 60).toString() } ?: "")) }
            if (isEmpty()) add(DraftStep())
        }
    }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var uploading by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            runCatching {
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching
                val type = context.contentResolver.getType(uri) ?: "image/jpeg"
                val ext = if (type.contains("png")) "png" else "jpg"
                val url = sdk.storage.upload(StorageBucket.RECIPE_IMAGES, "${UUID.randomUUID()}.$ext", bytes, type)
                photos.add(url)
            }
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "New Recipe" else "Edit Recipe") },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Default.Close, "Cancel") } },
                actions = { TextButton(onClick = { save() }, enabled = title.isNotBlank() && !busy) { Text("Save") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(title, { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(cuisine, { cuisine = it }, label = { Text("Cuisine") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(servings, { servings = it }, label = { Text("Servings") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f))
                OutlinedTextField(prep, { prep = it }, label = { Text("Prep") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f))
                OutlinedTextField(cook, { cook = it }, label = { Text("Cook") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f))
            }
            OutlinedTextField(description, { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())

            SectionHeader("Ingredients")
            ingredients.forEachIndexed { i, ing ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(ing.name, { ingredients[i] = ing.copy(name = it) }, label = { Text("Name") }, singleLine = true, modifier = Modifier.weight(2f))
                    OutlinedTextField(ing.quantity, { ingredients[i] = ing.copy(quantity = it) }, label = { Text("Qty") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.width(72.dp))
                    OutlinedTextField(ing.unit, { ingredients[i] = ing.copy(unit = it) }, label = { Text("Unit") }, singleLine = true, modifier = Modifier.width(72.dp))
                }
            }
            TextButton(onClick = { ingredients.add(DraftIngredient()) }) { Text("Add ingredient") }

            SectionHeader("Method")
            steps.forEachIndexed { i, step ->
                OutlinedTextField(step.instruction, { steps[i] = step.copy(instruction = it) }, label = { Text("Step ${i + 1}") }, modifier = Modifier.fillMaxWidth())
            }
            TextButton(onClick = { steps.add(DraftStep()) }) { Text("Add step") }

            SectionHeader("Plating  ·  ${photos.size}")
            Button(onClick = { picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !uploading) {
                Text(if (uploading) "Uploading…" else "Add photo")
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
        }
    }
}

private fun formatQty(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()
