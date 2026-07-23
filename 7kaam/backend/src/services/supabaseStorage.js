const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = '7kaam-assets';

let bucketChecked = false;
async function ensureBucketExists() {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets && !buckets.some(b => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn(`[supabaseStorage] Bucket check warning: ${err.message}`);
  }
}

/**
 * Upload a Buffer to Supabase Storage.
 * @param {Buffer} buffer - File contents
 * @param {string} path   - Storage path e.g. "kaamcards/worker-id/card-id.pdf"
 * @param {string} contentType - MIME type
 * @returns {string} Public URL
 */
async function uploadBuffer(buffer, path, contentType = 'application/octet-stream') {
  await ensureBucketExists();

  let { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error && (error.message?.includes('Bucket not found') || error.message?.includes('not_found'))) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    const retry = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    error = retry.error;
  }

  if (error) {
    console.error(`Supabase upload failed for ${path}:`, error.message);
    if (contentType.startsWith('image/')) {
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get a short-lived signed URL for reading a private asset (videos).
 */
async function getSignedUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Generate an upload presigned URL for direct client-side uploads.
 */
async function createUploadSignedUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(`Signed upload URL failed: ${error.message}`);
  return data;
}

module.exports = { supabase, uploadBuffer, getSignedUrl, createUploadSignedUrl };
