package com.chefvault.android.ui.collection

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.chefvault.android.ui.theme.BrandOrange
import com.chefvault.shared.model.CollectionStatus

/** Parse a hex color (e.g. "#FF7A00"); fall back to BrandOrange on any failure. */
fun collectionColor(hex: String?): Color = try {
    Color(android.graphics.Color.parseColor(hex))
} catch (e: Exception) {
    BrandOrange
}

/** Small pill showing a collection's Active/Draft status. */
@Composable
fun StatusChip(status: CollectionStatus) {
    val active = status == CollectionStatus.ACTIVE
    Surface(
        color = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(8.dp),
    ) {
        Text(
            text = if (active) "Active" else "Draft",
            style = MaterialTheme.typography.labelSmall,
            color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        )
    }
}
