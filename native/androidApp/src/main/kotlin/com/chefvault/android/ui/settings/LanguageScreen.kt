package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.slBody
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import kotlinx.coroutines.launch

@Composable
fun LanguageScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val current = profile?.language ?: "en"

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Language", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 18.dp, bottom = 40.dp),
            ) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(sl.surface)
                        .border(1.dp, sl.line, RoundedCornerShape(16.dp)),
                ) {
                    LANGUAGES.forEachIndexed { index, (code, label) ->
                        if (index > 0) SlDivider()
                        val flag = label.substringBefore("  ")
                        val name = label.substringAfter("  ")
                        val selected = code == current
                        Row(
                            Modifier.fillMaxWidth()
                                .clickable {
                                    scope.launch { runCatching { sdk.profile.update(ProfileUpdate(language = code)) } }
                                }
                                .padding(horizontal = 18.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Text(flag, style = slBody(20.0))
                            Text(
                                name,
                                style = slBody(14.0, if (selected) FontWeight.Bold else FontWeight.Normal),
                                color = sl.text,
                                modifier = Modifier.weight(1f),
                            )
                            if (selected) {
                                Icon(Icons.Default.Check, contentDescription = "Selected", tint = sl.accent, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
