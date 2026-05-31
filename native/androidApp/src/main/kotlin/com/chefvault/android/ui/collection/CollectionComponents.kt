package com.chefvault.android.ui.collection

import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.model.CollectionStatus

/** Four monochrome graphite tone pairs — mirrors iOS collection heroes and SlTile. */
val CollectionTones: List<List<Color>> = listOf(
    listOf(Color(0xFF2C2C2E), Color(0xFF3A3A3D)),
    listOf(Color(0xFF202022), Color(0xFF2D2D30)),
    listOf(Color(0xFF37373A), Color(0xFF46464A)),
    listOf(Color(0xFF181819), Color(0xFF262629)),
)

/** Stable tone index hashed from the collection id (matches iOS). */
fun collectionTone(id: String): Int = ((id.sumOf { it.code } % 4) + 4) % 4

fun collectionToneBrush(id: String): Brush = Brush.linearGradient(CollectionTones[collectionTone(id)])

/** Preset cover colors offered in create/edit (mirror of iOS collectionPresetHexes). */
val CollectionPresetHexes = listOf(
    "#3A3A3D", "#2D2D30", "#46464A", "#262629",
    "#52525A", "#1F1F22", "#5E5E64", "#34343A",
)

/** Parse a hex color and desaturate it to grayscale (monochrome design); fall back to the accent on failure. */
@Composable
fun collectionColor(hex: String?): Color {
    val accent = LocalSl.current.accent
    return try {
        val c = android.graphics.Color.parseColor(hex)
        // Monochrome design: desaturate any stored/preset color to its luminance gray.
        val r = ((c shr 16) and 0xFF) / 255f
        val g = ((c shr 8) and 0xFF) / 255f
        val b = (c and 0xFF) / 255f
        val gray = 0.299f * r + 0.587f * g + 0.114f * b
        Color(gray, gray, gray)
    } catch (e: Exception) {
        accent
    }
}

/** Service Line status pill — Active uses the ember accent, Draft a neutral surface. */
@Composable
fun SlCollectionStatusPill(status: CollectionStatus) {
    val sl = LocalSl.current
    val active = status == CollectionStatus.ACTIVE
    Text(
        text = (if (active) "Active" else "Draft").uppercase(),
        style = slMono(9.5, FontWeight.Bold).copy(letterSpacing = 0.8.sp),
        color = if (active) sl.accent else sl.muted,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (active) sl.accentSoft else sl.surface2)
            .border(1.dp, if (active) sl.accent.copy(alpha = 0.35f) else sl.line, RoundedCornerShape(50))
            .padding(horizontal = 9.dp, vertical = 5.dp),
    )
}
