package com.chefvault.android.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.Plan

/** A tappable grouped-list row used inside [com.chefvault.android.ui.common.CvCard]. */
@Composable
internal fun SettingsRow(
    title: String,
    subtitle: String? = null,
    trailing: String? = null,
    onClick: () -> Unit,
    last: Boolean = false,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        trailing?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (!last) Divider(color = MaterialTheme.colorScheme.outlineVariant)
}

internal fun unitsLabel(system: MeasurementSystem): String =
    if (system == MeasurementSystem.IMPERIAL) "Imperial" else "Metric"

internal fun planLabel(plan: Plan?): String =
    if (plan == Plan.PRO) "Pro plan" else "Free plan"

/** Supported UI languages: code → "flag  Native name". */
internal val LANGUAGES: List<Pair<String, String>> = listOf(
    "en" to "🇬🇧  English",
    "es" to "🇪🇸  Español",
    "fr" to "🇫🇷  Français",
    "de" to "🇩🇪  Deutsch",
    "it" to "🇮🇹  Italiano",
    "pt" to "🇵🇹  Português",
    "ja" to "🇯🇵  日本語",
    "zh" to "🇨🇳  中文",
)

internal fun languageName(code: String): String =
    LANGUAGES.firstOrNull { it.first == code }?.second?.substringAfter("  ") ?: code.uppercase()
