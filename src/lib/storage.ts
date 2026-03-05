import { supabase } from './supabase';

type Bucket = 'recipe-images' | 'avatars';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

async function getCurrentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

/** Uploads a local file:// URI to Supabase Storage and returns the public URL. */
export async function uploadImage(
  bucket: Bucket,
  localUri: string,
): Promise<string> {
  const userId = await getCurrentUserId();

  const response = await fetch(localUri);
  const arraybuffer = await response.arrayBuffer();

  const fileExt = localUri.split('.').pop()?.toLowerCase() ?? 'jpeg';
  const contentType = MIME_MAP[fileExt] ?? 'image/jpeg';
  const path = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, arraybuffer, { contentType, upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

/** Returns true if the URI is a local file path (not yet uploaded to storage). */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

/**
 * Uploads any local URIs in the array, passing through already-uploaded URLs.
 * Useful as a safety net before persisting to the database.
 */
export async function uploadImages(
  bucket: Bucket,
  uris: string[],
): Promise<string[]> {
  return Promise.all(
    uris.map((uri) =>
      isLocalUri(uri) ? uploadImage(bucket, uri) : Promise.resolve(uri),
    ),
  );
}
