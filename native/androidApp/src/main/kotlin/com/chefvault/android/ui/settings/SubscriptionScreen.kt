package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.android.ui.theme.slMono
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.model.Plan

private data class PlanFeature(val label: String, val free: String, val pro: String)

private val FEATURES = listOf(
    PlanFeature("Recipes", free = "Up to 50", pro = "Unlimited"),
    PlanFeature("Collections", free = "Unlimited", pro = "Unlimited"),
    PlanFeature("Prep lists", free = "Unlimited", pro = "Unlimited"),
    PlanFeature("Cloud backup", free = "✓", pro = "✓"),
    PlanFeature("Priority support", free = "—", pro = "✓"),
)

@Composable
fun SubscriptionScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val isPro = (profile?.plan ?: Plan.FREE) == Plan.PRO

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Subscription", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 16.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                PlanCard(isPro)
                ComparisonCard()
                UpgradeSection(isPro)
            }
        }
    }
}

@Composable
private fun PlanCard(isPro: Boolean) {
    val sl = LocalSl.current
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
            .background(Brush.linearGradient(listOf(sl.accent.copy(alpha = 0.22f), sl.surface)))
            .border(1.dp, sl.accent.copy(alpha = 0.30f), RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f)) {
                    Text("ChefVault ", style = slDisplay(17.0, FontWeight.ExtraBold), color = sl.text)
                    Text(if (isPro) "Pro" else "Free", style = slDisplay(17.0, FontWeight.ExtraBold), color = sl.accent)
                }
                if (isPro) {
                    Box(
                        Modifier.clip(CircleShape).background(sl.accent).padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "ACTIVE",
                            style = slMono(9.5, FontWeight.Bold).copy(letterSpacing = 0.5.sp),
                            color = sl.onAccent,
                        )
                    }
                }
            }
            Text(
                if (isPro) "You have access to every feature."
                else "Upgrade to unlock unlimited recipes and priority support.",
                style = slBody(12.5), color = sl.muted,
            )
        }
    }
}

@Composable
private fun ComparisonCard() {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SlKicker("Free vs Pro")
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(sl.surface)
                .border(1.dp, sl.line, RoundedCornerShape(16.dp)),
        ) {
            // Header row
            Row(
                Modifier.fillMaxWidth().background(sl.surface2).padding(horizontal = 13.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("FEATURE", style = headerStyle(), color = sl.faint, modifier = Modifier.weight(1f))
                Text("FREE", style = headerStyle(), color = sl.faint, textAlign = TextAlign.Center, modifier = Modifier.width(70.dp))
                Text("PRO", style = headerStyle(), color = sl.accent, textAlign = TextAlign.Center, modifier = Modifier.width(70.dp))
            }
            FEATURES.forEach { feature ->
                SlDivider()
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(feature.label, style = slBody(12.5), color = sl.text, modifier = Modifier.weight(1f))
                    Text(
                        feature.free, style = slMono(11.5),
                        color = if (feature.free == "—") sl.faint else sl.muted,
                        textAlign = TextAlign.Center, modifier = Modifier.width(70.dp),
                    )
                    Text(
                        feature.pro, style = slMono(11.5, FontWeight.Bold), color = sl.accent,
                        textAlign = TextAlign.Center, modifier = Modifier.width(70.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun headerStyle() = slMono(9.5, FontWeight.Bold).copy(letterSpacing = 0.5.sp)

@Composable
private fun UpgradeSection(isPro: Boolean) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
        SlButton(
            label = if (isPro) "You're on Pro" else "Upgrade to Pro",
            enabled = false,
            modifier = Modifier.fillMaxWidth(),
        ) {}
        Text(
            "PAYMENT INTEGRATION COMING SOON",
            style = slMono(9.5), color = sl.faint,
            textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth(),
        )
    }
}
