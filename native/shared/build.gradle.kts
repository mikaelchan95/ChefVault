plugins {
    alias(libs.plugins.kotlinMultiplatform)
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
        }
    }

    // Host-native target for running commonTest on the Mac (same Kotlin/Native backend
    // as iOS) without needing a booted simulator runtime. Not shipped in any app.
    macosArm64()

    sourceSets {
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
    }
}
