package com.chefvault.android.ui.auth

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
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

@Composable
private fun LoginScreen(sdk: ChefVaultSDK, onSignUp: () -> Unit, onForgot: () -> Unit) {
    val (state, run) = authForm()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("ChefVault", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Text("Professional Recipe Management", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(email, { email = it }, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(password, { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())

        state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        Button(onClick = { run { sdk.auth.signIn(email.trim(), password) } }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
            if (state.busy) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary) else Text("Sign In")
        }
        OutlinedButton(onClick = {
            scope.launch {
                runCatching {
                    val url = sdk.auth.oAuthUrl(OAuthProvider.GOOGLE, "chefvault://auth-callback")
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                }
            }
        }, modifier = Modifier.fillMaxWidth()) { Text("Continue with Google") }

        TextButton(onClick = onForgot, modifier = Modifier.align(Alignment.End)) { Text("Forgot Password?") }
        TextButton(onClick = onSignUp, modifier = Modifier.fillMaxWidth()) { Text("Don't have an account? Sign Up") }
    }
}

@Composable
private fun SignUpScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val (state, run) = authForm()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (sent) {
            Text("Check your email", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("We sent a confirmation link to $email. Confirm it, then sign in.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back to Sign In") }
        } else {
            Text("Create Account", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            OutlinedTextField(name, { name = it }, label = { Text("Full name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(email, { email = it }, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(password, { password = it }, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Button(
                onClick = { run { val result = sdk.auth.signUp(email.trim(), password, name.trim()); sent = result.needsConfirmation } },
                enabled = !state.busy, modifier = Modifier.fillMaxWidth(),
            ) { if (state.busy) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary) else Text("Sign Up") }
            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back to Sign In") }
        }
    }
}

@Composable
private fun ForgotScreen(sdk: ChefVaultSDK, onBack: () -> Unit) {
    val (state, run) = authForm()
    var email by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Reset Password", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        if (sent) {
            Text("If an account exists for $email, a reset link is on its way.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            OutlinedTextField(email, { email = it }, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            Button(onClick = { run { sdk.auth.resetPassword(email.trim()); sent = true } }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                Text("Send Reset Link")
            }
        }
        TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back to Sign In") }
    }
}
