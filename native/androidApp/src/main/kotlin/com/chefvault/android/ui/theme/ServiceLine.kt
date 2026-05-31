package com.chefvault.android.ui.theme

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// MARK: - Type helpers (Bricolage display / Hanken body / Space Mono)

fun slDisplay(size: Double, weight: FontWeight = FontWeight.Bold) =
    TextStyle(fontFamily = Bricolage, fontWeight = weight, fontSize = size.sp, letterSpacing = (-0.4).sp)
fun slBody(size: Double, weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontFamily = Hanken, fontWeight = weight, fontSize = size.sp)
fun slMono(size: Double, weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontFamily = SpaceMono, fontWeight = weight, fontSize = size.sp)

// MARK: - Background atmosphere (base + top ember glow)

@Composable
fun SlBackground(content: @Composable BoxScope.() -> Unit) {
    val sl = LocalSl.current
    Box(Modifier.fillMaxSize().background(sl.bg)) {
        Box(
            Modifier.fillMaxWidth().height(280.dp).background(
                Brush.verticalGradient(listOf(sl.accent.copy(alpha = 0.13f), Color.Transparent)),
            ),
        )
        content()
    }
}

// MARK: - Kicker (mono uppercase, wide tracking)

@Composable
fun SlKicker(text: String, color: Color = LocalSl.current.faint, size: Double = 10.0, modifier: Modifier = Modifier) {
    Text(text.uppercase(), style = slMono(size, FontWeight.Bold).copy(letterSpacing = 1.sp), color = color, modifier = modifier)
}

// MARK: - Card

@Composable
fun SlCard(modifier: Modifier = Modifier, soft: Boolean = false, padding: Int = 14, content: @Composable () -> Unit) {
    val sl = LocalSl.current
    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(if (soft) sl.surface2 else sl.surface)
            .border(1.dp, sl.line, RoundedCornerShape(16.dp))
            .padding(padding.dp),
    ) { content() }
}

// MARK: - Buttons

enum class SlVariant { Primary, Secondary, Ghost, Danger }

@Composable
fun SlButton(
    label: String,
    modifier: Modifier = Modifier,
    variant: SlVariant = SlVariant.Primary,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val sl = LocalSl.current
    val (bg, fg, border) = when (variant) {
        SlVariant.Primary -> Triple(sl.accent, sl.onAccent, sl.accent)
        SlVariant.Secondary -> Triple(sl.surface2, sl.text, sl.line2)
        SlVariant.Ghost -> Triple(Color.Transparent, sl.muted, Color.Transparent)
        SlVariant.Danger -> Triple(sl.danger.copy(alpha = 0.14f), sl.danger, sl.danger.copy(alpha = 0.35f))
    }
    Box(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (variant == SlVariant.Primary) sl.accent else bg)
            .border(1.dp, border, RoundedCornerShape(12.dp))
            .clickable(enabled = enabled) { onClick() }
            .padding(horizontal = 18.dp, vertical = 13.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, style = slBody(14.0, FontWeight.Bold), color = if (enabled) fg else fg.copy(alpha = 0.5f))
    }
}

// MARK: - Chip

@Composable
fun SlChip(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val sl = LocalSl.current
    Box(
        modifier
            .clip(CircleShape)
            .background(if (active) sl.accent else sl.surface2)
            .border(1.dp, if (active) sl.accent else sl.line, CircleShape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 13.dp, vertical = 7.dp),
    ) {
        Text(label, style = slBody(12.0, FontWeight.SemiBold), color = if (active) sl.onAccent else sl.muted)
    }
}

// MARK: - App bar (large display title + mono kicker + count)

@Composable
fun SlAppBar(
    title: String,
    kicker: String? = null,
    count: String? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val sl = LocalSl.current
    Row(
        Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 8.dp, bottom = 14.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(Modifier.weight(1f)) {
            if (kicker != null) SlKicker(kicker, color = sl.accent, size = 10.5)
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Text(title, style = slDisplay(30.0, FontWeight.ExtraBold), color = sl.text)
                if (count != null) Text(count, style = slMono(13.0, FontWeight.Bold), color = sl.muted, modifier = Modifier.padding(bottom = 4.dp))
            }
        }
        if (trailing != null) trailing()
    }
}

// MARK: - Icon button

@Composable
fun SlIconButton(icon: androidx.compose.ui.graphics.vector.ImageVector, accent: Boolean = false, onClick: () -> Unit) {
    val sl = LocalSl.current
    Box(
        Modifier.size(38.dp).clip(RoundedCornerShape(12.dp))
            .background(if (accent) sl.accent else sl.surface)
            .border(1.dp, if (accent) Color.Transparent else sl.line2, RoundedCornerShape(12.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = if (accent) sl.onAccent else sl.text, modifier = Modifier.size(18.dp))
    }
}

// MARK: - Search field

@Composable
fun SlSearchField(value: String, onValueChange: (String) -> Unit, placeholder: String = "Search recipes…") {
    val sl = LocalSl.current
    OutlinedTextField(
        value = value, onValueChange = onValueChange, singleLine = true,
        placeholder = { Text(placeholder, style = slBody(14.0), color = sl.faint) },
        textStyle = slBody(14.0).copy(color = sl.text),
        shape = RoundedCornerShape(12.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = sl.surface2, unfocusedContainerColor = sl.surface2,
            focusedIndicatorColor = sl.line2, unfocusedIndicatorColor = sl.line,
            cursorColor = sl.accent, focusedTextColor = sl.text, unfocusedTextColor = sl.text,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

// MARK: - Text field (form)

@Composable
fun SlTextField(
    value: String, onValueChange: (String) -> Unit, placeholder: String,
    modifier: Modifier = Modifier, secure: Boolean = false, keyboard: KeyboardType = KeyboardType.Text, singleLine: Boolean = true,
) {
    val sl = LocalSl.current
    OutlinedTextField(
        value = value, onValueChange = onValueChange, singleLine = singleLine,
        placeholder = { Text(placeholder, style = slBody(15.0), color = sl.faint) },
        textStyle = slBody(15.0).copy(color = sl.text),
        shape = RoundedCornerShape(12.dp),
        visualTransformation = if (secure) androidx.compose.ui.text.input.PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = sl.surface, unfocusedContainerColor = sl.surface,
            focusedIndicatorColor = sl.accent, unfocusedIndicatorColor = sl.line2,
            cursorColor = sl.accent, focusedTextColor = sl.text, unfocusedTextColor = sl.text,
        ),
        modifier = modifier.fillMaxWidth(),
    )
}

// MARK: - Color-hashed tile

private val SlTileTones = listOf(
    listOf(Color(0xFF2C2C2E), Color(0xFF3A3A3D)),
    listOf(Color(0xFF202022), Color(0xFF2D2D30)),
    listOf(Color(0xFF37373A), Color(0xFF46464A)),
    listOf(Color(0xFF181819), Color(0xFF262629)),
)

@Composable
fun SlTile(letter: String, tone: Int = 0, sizeDp: Int = 56, corner: Int = 14) {
    val sl = LocalSl.current
    Box(
        Modifier.size(sizeDp.dp).clip(RoundedCornerShape(corner.dp))
            .background(Brush.linearGradient(SlTileTones[((tone % 4) + 4) % 4]))
            .border(1.dp, sl.line2, RoundedCornerShape(corner.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text(letter, style = slDisplay(sizeDp * 0.4, FontWeight.Bold), color = Color.White.copy(alpha = 0.52f))
    }
}

// MARK: - Progress bar

@Composable
fun SlProgressBar(fraction: Float, modifier: Modifier = Modifier) {
    val sl = LocalSl.current
    LinearProgressIndicator(
        progress = { fraction.coerceIn(0f, 1f) },
        color = if (fraction >= 1f) sl.good else sl.accent,
        trackColor = sl.surface2,
        modifier = modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
    )
}

// MARK: - Toggle

@Composable
fun SlToggle(checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    val sl = LocalSl.current
    Box(
        Modifier.size(width = 40.dp, height = 23.dp).clip(CircleShape)
            .background(if (checked) sl.accent else sl.line2)
            .clickable { onCheckedChange(!checked) }
            .padding(2.5.dp),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(Modifier.size(18.dp).clip(CircleShape).background(Color.White))
    }
}

// MARK: - Sub-screen header (back + centered title)

@Composable
fun SlSubHeader(title: String, back: String = "Settings", onBack: () -> Unit) {
    val sl = LocalSl.current
    Box(Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 16.dp)) {
        Row(
            Modifier.align(Alignment.CenterStart).clickable { onBack() },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = back, tint = sl.muted, modifier = Modifier.size(18.dp))
            Text(back, style = slBody(14.5), color = sl.muted, modifier = Modifier.padding(start = 2.dp))
        }
        Text(title, style = slDisplay(16.0, FontWeight.Bold), color = sl.text, modifier = Modifier.align(Alignment.Center))
    }
}

// MARK: - Grouped settings

@Composable
fun SlSetGroup(title: String, content: @Composable () -> Unit) {
    val sl = LocalSl.current
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        SlKicker(title, modifier = Modifier.padding(start = 4.dp))
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(sl.surface)
                .border(1.dp, sl.line, RoundedCornerShape(16.dp)),
        ) { content() }
    }
}

@Composable
fun SlDivider() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(LocalSl.current.line))
}

// MARK: - Floating create button (place in a Box, aligned bottom-end above the tab bar)

@Composable
fun SlFab(onClick: () -> Unit) {
    val sl = LocalSl.current
    Box(
        Modifier.size(54.dp).clip(RoundedCornerShape(18.dp)).background(sl.accent).clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Filled.Add, contentDescription = "Create", tint = sl.onAccent, modifier = Modifier.size(26.dp))
    }
}
