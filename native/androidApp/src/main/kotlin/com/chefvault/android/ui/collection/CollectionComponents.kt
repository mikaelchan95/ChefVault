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

/** Four ember/sage/violet/steel tone pairs — mirrors iOS collection heroes and SlTile. */
val CollectionTones: List<List<Color>> = listOf(
    listOf(Color(0xFF2A1D14), Color(0xFF3A2415)),
    listOf(Color(0xFF15231C), Color(0xFF1C3327)),
    listOf(Color(0xFF241A25), Color(0xFF2F2036)),
    listOf(Color(0xFF1A2230), Color(0xFF22304A)),
)

/** Stable tone index hashed from the collection id (matches iOS). */
fun collectionTone(id: String): Int = ((id.sumOf { it.code } % 4) + 4) % 4

fun collectionToneBrush(id: String): Brush = Brush.linearGradient(CollectionTones[collectionTone(id)])

/** Preset cover colors offered in create/edit (mirror of iOS collectionPresetHexes). */
val CollectionPresetHexes = listOf(
    "#E2611C", "#E0735F", "#3F9B6B", "#3B82F6",
    "#A855F7", "#EC4899", "#F59E0B", "#14B8A6",
)

/** Parse a hex color (e.g. "#E2611C"); fall back to the ember accent on any failure. */
@Composable
fun collectionColor(hex: String?): Color {
    val accent = LocalSl.current.accent
    return try {
        Color(android.graphics.Color.parseColor(hex))
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
