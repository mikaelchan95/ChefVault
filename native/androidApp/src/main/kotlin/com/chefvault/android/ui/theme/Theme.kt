@file:OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)

package com.chefvault.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import com.chefvault.android.R

// MARK: - Type — Bricolage Grotesque (display) / Hanken Grotesk (body) / Space Mono (mono)

private fun wght(value: Int) = FontVariation.Settings(FontVariation.weight(value))

val Bricolage = FontFamily(
    Font(R.font.bricolage_grotesque, FontWeight.SemiBold, variationSettings = wght(600)),
    Font(R.font.bricolage_grotesque, FontWeight.Bold, variationSettings = wght(700)),
    Font(R.font.bricolage_grotesque, FontWeight.ExtraBold, variationSettings = wght(800)),
)
val Hanken = FontFamily(
    Font(R.font.hanken_grotesk, FontWeight.Normal, variationSettings = wght(400)),
    Font(R.font.hanken_grotesk, FontWeight.Medium, variationSettings = wght(500)),
    Font(R.font.hanken_grotesk, FontWeight.SemiBold, variationSettings = wght(600)),
    Font(R.font.hanken_grotesk, FontWeight.Bold, variationSettings = wght(700)),
)
val SpaceMono = FontFamily(
    Font(R.font.space_mono_regular, FontWeight.Normal),
    Font(R.font.space_mono_bold, FontWeight.Bold),
)

// MARK: - Color tokens (dark-first; ember accent constant across themes)

data class SlColors(
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val elevated: Color,
    val text: Color,
    val muted: Color,
    val faint: Color,
    val accent: Color = Color(0xFFE2611C),
    val onAccent: Color = Color(0xFF180D04),
    val accentSoft: Color = Color(0x26E2611C),
    val good: Color = Color(0xFF3F9B6B),
    val danger: Color = Color(0xFFE0735F),
    val line: Color,
    val line2: Color,
)

private val SlDark = SlColors(
    bg = Color(0xFF0D0D0F), surface = Color(0xFF161619), surface2 = Color(0xFF1D1D21),
    elevated = Color(0xFF26262B), text = Color(0xFFF4F1EA), muted = Color(0xFF9A978E),
    faint = Color(0xFF66635C), line = Color(0x14FFFFFF), line2 = Color(0x24FFFFFF),
)
private val SlLight = SlColors(
    bg = Color(0xFFF3EFE7), surface = Color(0xFFFBF9F4), surface2 = Color(0xFFF3EFE6),
    elevated = Color(0xFFFFFFFF), text = Color(0xFF1C1813), muted = Color(0xFF726A5E),
    faint = Color(0xFFA89F90), line = Color(0x1A1C1813), line2 = Color(0x2B1C1813),
)

val LocalSl = staticCompositionLocalOf { SlDark }

@Composable
fun ChefVaultTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val sl = if (darkTheme) SlDark else SlLight
    val scheme = if (darkTheme) {
        darkColorScheme(
            primary = sl.accent, onPrimary = sl.onAccent, secondary = sl.accent,
            background = sl.bg, onBackground = sl.text, surface = sl.surface, onSurface = sl.text,
            surfaceVariant = sl.surface2, onSurfaceVariant = sl.muted, surfaceContainer = sl.surface2,
            outline = sl.line2, outlineVariant = sl.line, error = sl.danger,
        )
    } else {
        lightColorScheme(
            primary = sl.accent, onPrimary = sl.onAccent, secondary = sl.accent,
            background = sl.bg, onBackground = sl.text, surface = sl.surface, onSurface = sl.text,
            surfaceVariant = sl.surface2, onSurfaceVariant = sl.muted, surfaceContainer = sl.surface2,
            outline = sl.line2, outlineVariant = sl.line, error = sl.danger,
        )
    }
    val typography = Typography(
        bodyLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal),
        bodyMedium = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.Normal),
        titleLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold),
        labelLarge = TextStyle(fontFamily = Hanken, fontWeight = FontWeight.SemiBold),
    )
    CompositionLocalProvider(LocalSl provides sl) {
        MaterialTheme(colorScheme = scheme, typography = typography, content = content)
    }
}

// Brand orange kept for any legacy reference; prefer LocalSl.current.accent.
val BrandOrange = Color(0xFFE2611C)
