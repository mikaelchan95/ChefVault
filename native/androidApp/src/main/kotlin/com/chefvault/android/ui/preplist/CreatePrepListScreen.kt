package com.chefvault.android.ui.preplist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Recipe
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePrepListScreen(sdk: ChefVaultSDK, onDone: () -> Unit) {
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = System.currentTimeMillis())
    var showDatePicker by remember { mutableStateOf(false) }
    val selectedIds = remember { mutableStateListOf<String>() }
    var busy by remember { mutableStateOf(false) }

    val dateString = datePickerState.selectedDateMillis?.let { dateFormat.format(it) } ?: dateFormat.format(System.currentTimeMillis())
    val canGenerate = name.isNotBlank() && selectedIds.isNotEmpty() && !busy

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Prep List") },
                navigationIcon = { IconButton(onClick = onDone) { Icon(Icons.Default.Close, "Cancel") } },
                actions = {
                    TextButton(
                        onClick = {
                            busy = true
                            scope.launch {
                                runCatching { sdk.prepLists.createFromRecipes(name, dateString, selectedIds.toList()) }
                                busy = false
                                onDone()
                            }
                        },
                        enabled = canGenerate,
                    ) { Text("Generate") }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) {
                Text("Date: $dateString")
            }

            SectionHeader("Recipes")
            if (recipes.isEmpty()) {
                Text("No recipes available.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                CvCard {
                    Column {
                        recipes.forEach { recipe ->
                            val checked = recipe.id in selectedIds
                            RecipeSelectRow(recipe, checked) {
                                if (checked) selectedIds.remove(recipe.id) else selectedIds.add(recipe.id)
                            }
                        }
                    }
                }
            }

            Text(
                "Will generate items from ${selectedIds.size} recipe(s)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Button(
                onClick = {
                    busy = true
                    scope.launch {
                        runCatching { sdk.prepLists.createFromRecipes(name, dateString, selectedIds.toList()) }
                        busy = false
                        onDone()
                    }
                },
                enabled = canGenerate,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (busy) "Generating…" else "Generate") }
        }
    }

    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = { TextButton(onClick = { showDatePicker = false }) { Text("OK") } },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancel") } },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun RecipeSelectRow(recipe: Recipe, checked: Boolean, onToggle: () -> Unit) {
    Surface(onClick = onToggle, color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (checked) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
                contentDescription = if (checked) "Selected" else "Not selected",
                tint = if (checked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(Modifier.weight(1f)) {
                Text(recipe.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 1)
                val meta = buildList {
                    recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
                    add("${recipe.ingredients.size} ingredients")
                }.joinToString(" · ")
                Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
