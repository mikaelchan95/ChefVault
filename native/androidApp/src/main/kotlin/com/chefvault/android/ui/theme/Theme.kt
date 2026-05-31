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

// MARK: - Color tokens (dark-first; monochrome accent — near-white on dark / near-black on light)

data class SlColors(
    val bg: Color,
    val surface: Color,
    val surface2: Color,
    val elevated: Color,
    val text: Color,
    val muted: Color,
    val faint: Color,
    val accent: Color = Color(0xFFF2F2EF),
    val onAccent: Color = Color(0xFF111112),
    val accentSoft: Color = Color(0x26F2F2EF),
    val good: Color = Color(0xFF3F9B6B),
    val danger: Color = Color(0xFFE0735F),
    val line: Color,
    val line2: Color,
)

private val SlDark = SlColors(
    bg = Color(0xFF0C0C0D), surface = Color(0xFF151517), surface2 = Color(0xFF1D1D1F),
    elevated = Color(0xFF272729), text = Color(0xFFF4F4F2), muted = Color(0xFF9A9A97),
    faint = Color(0xFF646462), line = Color(0x14FFFFFF), line2 = Color(0x26FFFFFF),
)
private val SlLight = SlColors(
    bg = Color(0xFFEEEEEC), surface = Color(0xFFF9F9F7), surface2 = Color(0xFFEFEFEC),
    elevated = Color(0xFFFFFFFF), text = Color(0xFF1A1A18), muted = Color(0xFF6C6C68),
    faint = Color(0xFFA4A4A0), line = Color(0x1A141412), line2 = Color(0x2B141412),
    accent = Color(0xFF1A1A18), onAccent = Color(0xFFF7F7F5), accentSoft = Color(0x261A1A18),
    good = Color(0xFF2F7D54), danger = Color(0xFFC4543F),
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
