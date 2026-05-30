package com.chefvault.android.ui.common

import android.content.Context
import android.net.Uri
import com.chefvault.shared.data.repository.StorageBucket
import com.chefvault.shared.data.repository.StorageRepository
import java.util.UUID

/**
 * Reads a picked image URI and uploads it through the shared [StorageRepository],
 * returning the public URL (or null if the stream couldn't be opened). Shared by the
 * recipe form and the profile avatar picker.
 */
suspend fun uploadPickedImage(
    context: Context,
    uri: Uri,
    storage: StorageRepository,
    bucket: StorageBucket,
): String? {
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    val type = context.contentResolver.getType(uri) ?: "image/jpeg"
    val ext = if (type.contains("png")) "png" else "jpg"
    return storage.upload(bucket, "${UUID.randomUUID()}.$ext", bytes, type)
}
