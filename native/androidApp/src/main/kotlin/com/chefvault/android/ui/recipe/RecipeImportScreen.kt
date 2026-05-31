package com.chefvault.android.ui.recipe

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.NewRecipe
import kotlinx.coroutines.launch

/** Paste a TikTok/Instagram/YouTube/recipe link → parse server-side → review in the form.
 *  Mirrors iOS ImportRecipeView; reuses RecipeFormScreen for the review/save step. */
@Composable
fun RecipeImportScreen(sdk: ChefVaultSDK, onDone: () -> Unit, initialUrl: String? = null) {
    var draft by remember { mutableStateOf<NewRecipe?>(null) }
    var warnings by remember { mutableStateOf<List<String>>(emptyList()) }

    val parsed = draft
    if (parsed != null) {
        RecipeFormScreen(sdk, recipeId = null, onDone = onDone, draft = parsed, importWarnings = warnings)
    } else {
        ImportPaste(sdk, onCancel = onDone, onParsed = { r, w -> warnings = w; draft = r }, initialUrl = initialUrl)
    }
}

@Composable
private fun ImportPaste(
    sdk: ChefVaultSDK,
    onCancel: () -> Unit,
    onParsed: (NewRecipe, List<String>) -> Unit,
    initialUrl: String? = null,
) {
    val sl = LocalSl.current
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current
    var url by remember { mutableStateOf("") }
    var parsing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val runImport: () -> Unit = run@{
        if (url.isBlank() || parsing) return@run
        parsing = true
        error = null
        scope.launch {
            try {
                val result = sdk.recipes.importFromUrl(url.trim())
                onParsed(result.recipe, result.warnings)
            } catch (e: Exception) {
                error = e.message ?: "Couldn't read a recipe from that link. Try another, or add it manually."
            } finally {
                parsing = false
            }
        }
    }

    LaunchedEffect(initialUrl) {
        if (!initialUrl.isNullOrBlank()) {
            // Shared in → prefill and import straight away.
            url = initialUrl
            runImport()
        } else {
            // Prefill from the clipboard when it holds a URL (the common "just copied a link" case).
            val clip = clipboard.getText()?.text
            if (url.isBlank() && clip != null && clip.startsWith("http", ignoreCase = true)) url = clip
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Import from Link", back = "Recipes", onBack = onCancel)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp).padding(bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SlKicker("Paste a link")
                Text(
                    "Paste a TikTok, Instagram, YouTube, or recipe-page link. ChefVault reads it and fills in a recipe you can review.",
                    style = slBody(12.5), color = sl.muted,
                )
                SlTextField(value = url, onValueChange = { url = it }, placeholder = "https://…", keyboard = KeyboardType.Uri)
                error?.let { Text(it, style = slBody(12.5), color = sl.danger) }
                SlButton(
                    label = if (parsing) "Reading the recipe…" else "Import recipe",
                    enabled = url.isNotBlank() && !parsing,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    runImport()
                }
                Text(
                    "Watches the video or reads the page to pull out ingredients and steps. Nothing is saved until you review and tap Save.",
                    style = slMono(9.5), color = sl.faint,
                )
            }
        }
    }
}
