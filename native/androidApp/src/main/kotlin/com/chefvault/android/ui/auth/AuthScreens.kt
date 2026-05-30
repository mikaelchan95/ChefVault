package com.chefvault.android.ui.auth

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chefvault.android.ui.theme.LocalSl
import com.chefvault.android.ui.theme.SlBackground
import com.chefvault.android.ui.theme.SlButton
import com.chefvault.android.ui.theme.SlDivider
import com.chefvault.android.ui.theme.SlKicker
import com.chefvault.android.ui.theme.SlTextField
import com.chefvault.android.ui.theme.SlVariant
import com.chefvault.android.ui.theme.slBody
import com.chefvault.android.ui.theme.slDisplay
import com.chefvault.shared.data.ChefVaultSDK
import com.chefvault.shared.data.repository.OAuthProvider
import kotlinx.coroutines.launch

@Composable
fun AuthFlow(sdk: ChefVaultSDK) {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "login") {
        composable("login") { LoginScreen(sdk, onSignUp = { nav.navigate("signup") }, onForgot = { nav.navigate("forgot") }) }
        composable("signup") { SignUpScreen(sdk, onBack = { nav.popBackStack() }) }
        composable("forgot") { ForgotScreen(sdk, onBack = { nav.popBackStack() }) }
    }
}

private class FormState {
    var busy by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
}

@Composable
private fun authForm(): Pair<FormState, (suspend () -> Unit) -> Unit> {
    val state = remember { FormState() }
    val scope = rememberCoroutineScope()
    val run: (suspend () -> Unit) -> Unit = { block ->
        scope.launch {
            state.busy = true
            state.error = null
            try {
                block()
            } catch (e: Exception) {
                state.error = e.message ?: "Something went wrong"
            } finally {
                state.busy = false
            }
        }
    }
    return state to run
}

// MARK: - Shared scaffolding

@Composable
private fun AuthScaffold(content: @Composable ColumnScope.() -> Unit) {
    SlBackground {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            content()
        }
    }
}

@Composable
private fun BackLink(onBack: () -> Unit) {
    val sl = LocalSl.current
    Row(
        Modifier.clickable { onBack() }.padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Back", tint = sl.muted, modifier = Modifier.size(18.dp))
        Text("Back", style = slBody(13.5), color = sl.muted)
    }
}

@Composable
private fun ErrorText(message: String) {
    Text(message, style = slBody(12.5), color = LocalSl.current.danger, modifier = Modifier.padding(top = 4.dp))
}

@Composable
private fun CheckEmailState(email: String, onBack: () -> Unit) {
    val sl = LocalSl.current
    Column(
        Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(70.dp).clip(RoundedCornerShape(22.dp)).border(2.dp, sl.line2, RoundedCornerShape(22.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.MailOutline, contentDescription = null, tint = sl.accent, modifier = Modifier.size(30.dp))
        }
        Text(
            "Check your email",
            style = slDisplay(23.0, FontWeight.ExtraBold),
            color = sl.text,
            modifier = Modifier.padding(top = 18.dp),
        )
        Text(
            text = "If an account exists for ${email.ifBlank { "that address" }}, a confirmation link is on its way.",
            style = slBody(13.0),
            color = sl.muted,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(max = 250.dp).padding(top = 9.dp),
        )
        SlButton("Back to Sign In", variant = SlVariant.Secondary, modifier = Modifier.fillMaxWidth().padding(top = 24.dp)) { onBack() }
    }
}

// MARK: - Login

@Composable
private fun LoginScreen(sdk: ChefVaultSDK, onSignUp: () -> Unit, onForgot: () -> Unit) {
    val sl = LocalSl.current
    val (state, run) = authForm()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    AuthScaffold {
        Column(Modifier.padding(bottom = 26.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("ChefVault", style = slDisplay(40.0, FontWeight.ExtraBold), color = sl.accent)
            Text("Your kitchen, organized.", style = slBody(13.5), color = sl.muted)
        }

        SlTextField(email, { email = it }, placeholder = "chef@restaurant.com", keyboard = KeyboardType.Email)
        Box(Modifier.padding(top = 13.dp)) {
            SlTextField(password, { password = it }, placeholder = "Password", secure = true)
        }

        Text(
            "Forgot password?",
            style = slBody(12.5),
            color = sl.muted,
            textAlign = TextAlign.End,
            modifier = Modifier.fillMaxWidth().clickable { onForgot() }.padding(top = 13.dp, bottom = 15.dp),
        )

        state.error?.let { ErrorText(it) }

        SlButton(if (state.busy) "Signing in…" else "Sign In", enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
            run { sdk.auth.signIn(email.trim(), password) }
        }

        Row(
            Modifier.fillMaxWidth().padding(vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            Box(Modifier.weight(1f)) { SlDivider() }
            SlKicker("or")
            Box(Modifier.weight(1f)) { SlDivider() }
        }

        SlButton("Continue with Google", variant = SlVariant.Secondary, modifier = Modifier.fillMaxWidth()) {
            scope.launch {
                runCatching {
                    val url = sdk.auth.oAuthUrl(OAuthProvider.GOOGLE, "chefvault://auth-callback")
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                }
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(top = 18.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            Text("New here? ", style = slBody(12.5), color = sl.muted)
            Text(
                "Create account",
                style = slBody(12.5, FontWeight.Bold),
                color = sl.accent,
                modifier = Modifier.clickable { onSignUp() },
            )
        }
    }
}

// MARK: - Sign up

@Composable
private fun SignUpScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val (state, run) = authForm()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }

    AuthScaffold {
        if (sent) {
            CheckEmailState(email, onBack)
        } else {
            BackLink(onBack)
            Text("Create account", style = slDisplay(26.0, FontWeight.ExtraBold), color = sl.text)
            Text(
                "Free plan · up to 50 recipes",
                style = slBody(13.0),
                color = sl.muted,
                modifier = Modifier.padding(top = 4.dp, bottom = 22.dp),
            )

            SlTextField(name, { name = it }, placeholder = "Jordan Lee")
            Box(Modifier.padding(top = 13.dp)) {
                SlTextField(email, { email = it }, placeholder = "chef@restaurant.com", keyboard = KeyboardType.Email)
            }
            Box(Modifier.padding(top = 13.dp)) {
                SlTextField(password, { password = it }, placeholder = "Password", secure = true)
            }

            state.error?.let { ErrorText(it) }

            SlButton(
                if (state.busy) "Creating account…" else "Create account",
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth().padding(top = 15.dp),
            ) {
                run {
                    val result = sdk.auth.signUp(email.trim(), password, name.trim())
                    sent = result.needsConfirmation
                }
            }

            Text(
                "Inline validation · email confirmation sent after submit",
                style = slBody(11.5),
                color = sl.faint,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
        }
    }
}

// MARK: - Forgot password

@Composable
private fun ForgotScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val sl = LocalSl.current
    val (state, run) = authForm()
    var email by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }

    AuthScaffold {
        if (sent) {
            CheckEmailState(email, onBack)
        } else {
            BackLink(onBack)
            Text("Reset password", style = slDisplay(26.0, FontWeight.ExtraBold), color = sl.text)
            Text(
                "Enter your account email and we'll send a reset link.",
                style = slBody(13.0),
                color = sl.muted,
                modifier = Modifier.padding(top = 7.dp, bottom = 22.dp),
            )

            SlTextField(email, { email = it }, placeholder = "chef@restaurant.com", keyboard = KeyboardType.Email)

            state.error?.let { ErrorText(it) }

            SlButton(
                if (state.busy) "Sending…" else "Send reset link",
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            ) {
                run {
                    sdk.auth.resetPassword(email.trim())
                    sent = true
                }
            }

            Text(
                "Always shows success — never reveals whether an email exists.",
                style = slBody(11.5),
                color = sl.faint,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
        }
    }
}
