package com.chefvault.android.ui.preplist

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlCard
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.SlTile
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Recipe
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePrepListScreen(sdk: ChefVaultSDK, onDone: () -> Unit) {
    val sl = LocalSl.current
    val recipes by sdk.recipes.recipes.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = System.currentTimeMillis())
    var showDatePicker by remember { mutableStateOf(false) }
    val selectedIds = remember { mutableStateListOf<String>() }
    var busy by remember { mutableStateOf(false) }

    val dateString = datePickerState.selectedDateMillis?.let { dateFormat.format(it) } ?: dateFormat.format(System.currentTimeMillis())
    val canGenerate = name.isNotBlank() && selectedIds.isNotEmpty() && !busy

    fun generate() {
        busy = true
        scope.launch {
            runCatching { sdk.prepLists.createFromRecipes(name, dateString, selectedIds.toList()) }
            busy = false
            onDone()
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize().padding(top = 8.dp)) {
            // Header: Cancel · New Prep List · Generate (mirrors iOS sheet header)
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Cancel",
                    style = slBody(14.0),
                    color = sl.muted,
                    modifier = Modifier.clickable { onDone() },
                )
                Text("New Prep List", style = slDisplay(16.0, FontWeight.Bold), color = sl.text)
                Text(
                    if (busy) "Generating…" else "Generate",
                    style = slBody(14.0, FontWeight.Bold),
                    color = if (canGenerate) sl.accent else sl.accent.copy(alpha = 0.4f),
                    modifier = Modifier.clickable(enabled = canGenerate) { generate() },
                )
            }
            SlDivider()

            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                // Name
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlKicker("List name")
                    SlTextField(value = name, onValueChange = { name = it }, placeholder = "Friday Dinner Service")
                }

                // Date
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SlKicker("Service date")
                    Row(
                        Modifier.fillMaxWidth().height(46.dp).clip(RoundedCornerShape(12.dp))
                            .background(sl.surface).border(1.dp, sl.line2, RoundedCornerShape(12.dp))
                            .clickable { showDatePicker = true }
                            .padding(horizontal = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(dateString, style = slBody(15.0), color = sl.text)
                    }
                }

                SlDivider()

                // Recipes
                Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        SlKicker("Select recipes")
                        Text("${selectedIds.size} SELECTED", style = slMono(10.5, FontWeight.Bold), color = sl.accent)
                    }
                    if (recipes.isEmpty()) {
                        Text(
                            "No recipes available. Create a recipe first.",
                            style = slBody(13.0), color = sl.muted,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                            recipes.forEachIndexed { index, recipe ->
                                val checked = recipe.id in selectedIds
                                RecipeSelectRow(recipe, checked, index) {
                                    if (checked) selectedIds.remove(recipe.id) else selectedIds.add(recipe.id)
                                }
                            }
                        }
                    }
                }

                // Preview
                SlCard(soft = true) {
                    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        SlKicker("Live preview")
                        Text(
                            "Will generate items from ${selectedIds.size} recipe${if (selectedIds.size == 1) "" else "s"}",
                            style = slBody(13.0), color = sl.muted,
                        )
                    }
                }

                Spacer(Modifier.size(40.dp))
            }
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
private fun RecipeSelectRow(recipe: Recipe, checked: Boolean, tone: Int, onToggle: () -> Unit) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(if (checked) sl.accentSoft else sl.surface)
            .border(1.dp, if (checked) sl.accent else sl.line, RoundedCornerShape(12.dp))
            .clickable { onToggle() }
            .padding(11.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(22.dp).clip(CircleShape)
                .background(if (checked) sl.accent else Color.Transparent)
                .border(1.5.dp, if (checked) Color.Transparent else sl.line2, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (checked) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = sl.onAccent, modifier = Modifier.size(13.dp))
            }
        }
        SlTile(letter = recipe.title.take(1).uppercase(), tone = tone, sizeDp = 34, corner = 9)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(recipe.title, style = slDisplay(13.5, FontWeight.Bold), color = sl.text, maxLines = 1)
            val meta = buildList {
                recipe.cuisine?.takeIf { it.isNotBlank() }?.let { add(it) }
                add("${recipe.ingredients.size} ingredient${if (recipe.ingredients.size == 1) "" else "s"}")
            }.joinToString(" · ")
            Text(meta, style = slMono(10.5), color = sl.muted)
        }
    }
}
