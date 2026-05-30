package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlToggle
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.model.MeasurementSystem
import com.chefvault.shared.model.Plan

/**
 * One row inside an [com.chefvault.android.ui.theme.SlSetGroup]: a label plus either a
 * mono "value ›" stamp (navigating) or an [SlToggle]. Mirrors the iOS `SLSetRow`.
 */
@Composable
internal fun SlSetRow(
    label: String,
    value: String? = null,
    onClick: (() -> Unit)? = null,
    toggle: Boolean? = null,
    onToggle: ((Boolean) -> Unit)? = null,
) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 14.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(label, style = slBody(13.5), color = sl.text, modifier = Modifier.weight(1f))
        if (toggle != null && onToggle != null) {
            SlToggle(checked = toggle, onCheckedChange = onToggle)
        } else {
            val v = value ?: ""
            Text(if (v.isEmpty()) "›" else "$v ›", style = slMono(12.0), color = sl.muted)
        }
    }
}

/** Initials (up to two letters) for the avatar tile, mirroring the iOS computation. */
internal fun initialsFor(name: String): String {
    val letters = name.split(" ").filter { it.isNotBlank() }.take(2)
        .mapNotNull { it.firstOrNull()?.toString() }.joinToString("")
    return letters.ifEmpty { name.take(1) }.uppercase()
}

/** Three-segment password strength meter (weak / fair / strong). Mirrors the iOS bar. */
@Composable
internal fun PasswordStrengthBar(password: String) {
    if (password.isEmpty()) return
    val sl = LocalSl.current
    val score = run {
        var s = 0
        if (password.length >= 8) s += 1
        if (password.any { it.isUpperCase() } && password.any { it.isLowerCase() }) s += 1
        if (password.any { it.isDigit() }) s += 1
        s
    }
    val barColor = when {
        score <= 1 -> sl.danger
        score == 2 -> sl.accent
        else -> sl.good
    }
    val label = when {
        score <= 1 -> "Weak"
        score == 2 -> "Fair"
        else -> "Strong"
    }
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(3) { index ->
            Box(
                Modifier.weight(1f).height(4.dp).clip(CircleShape)
                    .background(if (index < score) barColor else sl.surface2),
            )
        }
        Text(label, style = slBody(11.5), color = barColor)
    }
}

internal fun unitsLabel(system: MeasurementSystem): String =
    if (system == MeasurementSystem.IMPERIAL) "Imperial" else "Metric"

internal fun planLabel(plan: Plan?): String =
    if (plan == Plan.PRO) "Pro" else "Free"

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
