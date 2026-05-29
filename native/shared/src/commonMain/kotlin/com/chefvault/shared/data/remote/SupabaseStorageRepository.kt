package com.chefvault.shared.data.remote

import com.chefvault.shared.data.repository.AuthRepository
import com.chefvault.shared.data.repository.StorageBucket
import com.chefvault.shared.data.repository.StorageRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.storage.storage
import io.ktor.http.ContentType

class SupabaseStorageRepository(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
) : StorageRepository {

    override suspend fun upload(
        bucket: StorageBucket,
        fileName: String,
        bytes: ByteArray,
        contentType: String,
    ): String {
        val uid = auth.currentUserId() ?: error("Not authenticated")
        // Path convention `userId/fileName` matches the storage RLS folder policy.
        val path = "$uid/$fileName"
        val bucketApi = client.storage.from(bucket.id)
        bucketApi.upload(path, bytes) {
            upsert = false
            this.contentType = ContentType.parse(contentType)
        }
        return bucketApi.publicUrl(path)
    }
}
