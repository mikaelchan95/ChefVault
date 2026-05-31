import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)
    alias(libs.plugins.skie)
}

kotlin {
    // iOS targets first (iOS-first build order).
    val iosTargets = listOf(iosArm64(), iosSimulatorArm64(), iosX64())
    iosTargets.forEach { target ->
        target.binaries.framework {
            baseName = "ChefVaultShared"
            isStatic = true
            binaryOption("bundleId", "com.chefvault.shared")
        }
    }

    // Android target — the Compose app consumes the exact same shared logic, no bridging.
    androidTarget {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }

    // Host-native target for running commonTest on the Mac (same Kotlin/Native backend
    // as iOS) without needing a booted simulator runtime. Not shipped in any app.
    macosArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
            implementation(project.dependencies.platform(libs.supabase.bom))
            implementation(libs.supabase.auth)
            implementation(libs.supabase.postgrest)
            implementation(libs.supabase.storage)
            implementation(libs.supabase.functions)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
        // Ktor Darwin engine for all Apple targets (iOS + macOS host-test). supabase-kt
        // needs a platform HTTP engine supplied explicitly. multiplatform-settings backs
        // the Keychain session store on Apple.
        appleMain.dependencies {
            implementation(libs.ktor.client.darwin)
            implementation(libs.multiplatform.settings)
        }
        // OkHttp Ktor engine for Android.
        androidMain.dependencies {
            implementation(libs.ktor.client.okhttp)
        }
    }
}

android {
    namespace = "com.chefvault.shared"
    compileSdk = 35
    defaultConfig {
        minSdk = 26
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
