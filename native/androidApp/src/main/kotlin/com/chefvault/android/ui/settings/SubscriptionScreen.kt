package com.chefvault.android.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.common.CvCard
import com.chefvault.android.ui.common.SectionHeader
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Plan

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val plan = profile?.plan ?: Plan.FREE

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subscription") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            CvCard {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Current Plan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        if (plan == Plan.PRO) "Pro" else "Free",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        if (plan == Plan.PRO) "Unlimited recipes and premium features." else "Up to 50 recipes.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            CvCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionHeader("Free vs Pro")
                    ComparisonRow("Recipes", free = "Up to 50", pro = "Unlimited")
                    ComparisonRow("Collections", freeIncluded = true, proIncluded = true)
                    ComparisonRow("Prep lists", freeIncluded = true, proIncluded = true)
                    ComparisonRow("Data export", freeIncluded = true, proIncluded = true)
                    ComparisonRow("Priority support", freeIncluded = false, proIncluded = true)
                }
            }

            Text(
                "Payment integration coming soon",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                Text("Upgrade to Pro", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun ComparisonRow(
    label: String,
    free: String? = null,
    pro: String? = null,
    freeIncluded: Boolean? = null,
    proIncluded: Boolean? = null,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Cell(free, freeIncluded)
        Cell(pro, proIncluded)
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.Cell(text: String?, included: Boolean?) {
    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        when {
            text != null -> Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            included == true -> Icon(Icons.Default.Check, contentDescription = "Included", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            else -> Icon(Icons.Default.Close, contentDescription = "Not included", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        }
    }
}
