package com.chefvault.android.ui.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.roundToLong

/** Flat card with a hairline outline (brand: strokes over shadows). */
@Composable
fun CvCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outline),
    ) {
        Box(Modifier.padding(16.dp)) { content() }
    }
}

/** Uppercased, wide-tracked section label — a brand signature. */
@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.SemiBold,
        letterSpacing = 0.8.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}

@Composable
fun BusyIndicator() {
    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
}

/** Drops a trailing ".0" (2.0 -> "2", 1.5 -> "1.5"). */
fun formatQuantity(value: Double): String {
    if (value == value.roundToLong().toDouble() && abs(value) < 1e15) return value.roundToLong().toString()
    return value.toString().trimEnd('0').trimEnd('.')
}
