package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Scale
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.model.MeasurementSystem
import kotlinx.coroutines.launch

@Composable
fun UnitsScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val current = profile?.defaultUnits ?: MeasurementSystem.METRIC

    fun select(system: MeasurementSystem) {
        scope.launch { runCatching { sdk.profile.update(ProfileUpdate(defaultUnits = system)) } }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Default Units", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 18.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                SlKicker("Measurement system", modifier = Modifier.padding(start = 4.dp))
                UnitCard(
                    icon = Icons.Default.Scale,
                    title = "Metric",
                    description = "Grams, kilograms, millilitres, litres.",
                    selected = current == MeasurementSystem.METRIC,
                ) { select(MeasurementSystem.METRIC) }
                UnitCard(
                    icon = Icons.Default.Straighten,
                    title = "Imperial",
                    description = "Ounces, pounds, cups, tablespoons.",
                    selected = current == MeasurementSystem.IMPERIAL,
                ) { select(MeasurementSystem.IMPERIAL) }
            }
        }
    }
}

@Composable
private fun UnitCard(
    icon: ImageVector,
    title: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(sl.surface)
            .border(if (selected) 1.5.dp else 1.dp, if (selected) sl.accent else sl.line, RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            Modifier.size(48.dp).clip(RoundedCornerShape(12.dp))
                .background(if (selected) sl.accent else sl.accentSoft),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) sl.onAccent else sl.accent, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = slDisplay(17.0, FontWeight.Bold), color = sl.text)
            Text(description, style = slBody(12.5), color = sl.muted)
        }
        if (selected) {
            Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = sl.accent, modifier = Modifier.size(20.dp))
        }
    }
}
