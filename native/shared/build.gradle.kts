plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.skie)
}

kotlin {
    // iOS targets first (iOS-first build order). androidTarget() is added in the
    // Android phase once the Android SDK is installed — commonMain is platform-agnostic
    // so this deferral costs nothing.
    val iosTargets = listOf(iosArm64(), iosSimulatorArm64(), iosX64())
    iosTargets.forEach { target ->
        target.binaries.framework {
            baseName = "ChefVaultShared"
            isStatic = true
            binaryOption("bundleId", "com.chefvault.shared")
        }
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
    }
}
