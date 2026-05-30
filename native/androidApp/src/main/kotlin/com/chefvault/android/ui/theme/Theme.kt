package com.chefvault.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Brand orange — constant across light/dark and both platforms. */
val BrandOrange = Color(0xFFFF7A00)
val BrandOrangeTint = Color(0x26FF7A00)

// Fixed brand color scheme takes precedence over Material You dynamic color (staff-tool guidance).
private val DarkColors = darkColorScheme(
    primary = BrandOrange,
    onPrimary = Color.White,
    primaryContainer = BrandOrange,
    secondary = BrandOrange,
    background = Color(0xFF121212),
    onBackground = Color(0xFFE0E0E0),
    surface = Color(0xFF1E1E1E),
    onSurface = Color(0xFFE0E0E0),
    surfaceVariant = Color(0xFF1A1A1A),
    onSurfaceVariant = Color(0xFF94A3B8),
    surfaceContainer = Color(0xFF161616),
    outline = Color(0xFF2D2D2D),
    outlineVariant = Color(0xFF2D2D2D),
    error = Color(0xFFEF4444),
)

private val LightColors = lightColorScheme(
    primary = BrandOrange,
    onPrimary = Color.White,
    primaryContainer = BrandOrangeTint,
    secondary = BrandOrange,
    background = Color(0xFFF5F4F2),
    onBackground = Color(0xFF1C1917),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1C1917),
    surfaceVariant = Color(0xFFEFEEEC),
    onSurfaceVariant = Color(0xFF57534E),
    surfaceContainer = Color(0xFFFAFAF9),
    outline = Color(0xFFD8D4D0),
    outlineVariant = Color(0xFFE5E1DD),
    error = Color(0xFFDC2626),
)

@Composable
fun ChefVaultTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
