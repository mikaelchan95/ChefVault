package com.chefvault.android.ui.settings
import androidx.compose.material3.Text

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.chefvault.android.ui.common.uploadPickedImage
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlSubHeader
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.SlTile
import com.chefvault.android.ui.theme.slBody
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.ProfileUpdate
import com.chefvault.shared.data.repository.StorageBucket
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val profile by sdk.profile.profile.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var name by remember(profile?.id) { mutableStateOf(profile?.name ?: "") }
    var title by remember(profile?.id) { mutableStateOf(profile?.title ?: "") }
    var avatarUrl by remember(profile?.id) { mutableStateOf(profile?.avatarUrl) }
    var uploading by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            runCatching { uploadPickedImage(context, uri, sdk.storage, StorageBucket.AVATARS)?.let { avatarUrl = it } }
            uploading = false
        }
    }

    fun save() {
        busy = true
        error = null
        scope.launch {
            try {
                sdk.profile.update(ProfileUpdate(name = name, title = title.ifBlank { null }, avatarUrl = avatarUrl))
                onBack()
            } catch (e: Exception) {
                error = e.message ?: "Save failed"
            } finally {
                busy = false
            }
        }
    }

    SlBackground {
        Column(Modifier.fillMaxSize()) {
            SlSubHeader(title = "Profile", onBack = onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp).padding(top = 18.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Avatar picker
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Box(
                        Modifier.size(80.dp).clip(RoundedCornerShape(40.dp))
                            .clickable(enabled = !uploading) {
                                picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                        contentAlignment = Alignment.BottomEnd,
                    ) {
                        val avatar = avatarUrl
                        if (avatar.isNullOrBlank()) {
                            SlTile(letter = initialsFor(name.ifBlank { "—" }), sizeDp = 80, corner = 40)
                        } else {
                            AsyncImage(
                                model = avatar,
                                contentDescription = "Avatar",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(80.dp).clip(RoundedCornerShape(40.dp))
                                    .border(1.dp, sl.line2, RoundedCornerShape(40.dp)),
                            )
                        }
                        // Pencil badge
                        Box(
                            Modifier.size(28.dp).clip(RoundedCornerShape(14.dp)).background(sl.accent)
                                .border(2.dp, sl.bg, RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("✎", style = slBody(12.0, FontWeight.Bold), color = sl.onAccent)
                        }
                    }
                    if (uploading) {
                        CircularProgressIndicator(color = sl.accent, modifier = Modifier.size(20.dp))
                    } else {
                        Text("Tap to change avatar (square crop)", style = slBody(11.5), color = sl.muted)
                    }
                }

                SlTextField(value = name, onValueChange = { name = it }, placeholder = "Full name")
                SlTextField(value = title, onValueChange = { title = it }, placeholder = "Title / role (optional)")
                ReadOnlyField(label = "Email", value = profile?.email ?: "")

                error?.let { Text(it, style = slBody(12.5), color = sl.danger, modifier = Modifier.fillMaxWidth()) }

                SlButton(
                    label = if (busy) "Saving…" else "Save changes",
                    enabled = name.isNotBlank() && !busy && !uploading,
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) { save() }
            }
        }
    }
}

@Composable
private fun ReadOnlyField(label: String, value: String) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(sl.surface2)
            .border(1.dp, sl.line, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = slBody(11.0), color = sl.faint)
            Text(value, style = slBody(15.0), color = sl.muted)
        }
        Text("🔒", style = slBody(13.0), color = sl.muted)
    }
}
