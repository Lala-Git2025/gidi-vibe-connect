/**
 * Streaming media upload to Supabase Storage.
 *
 * ── Why this bypasses supabase-js ───────────────────────────────────────────
 *
 * `supabase.storage.from(...).upload()` takes an in-memory body, so the whole
 * file has to be materialised in the JS heap before it can be sent. The
 * pattern this replaces did:
 *
 *   const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
 *   const binaryStr = atob(base64);
 *   const bytes = new Uint8Array(binaryStr.length);
 *   for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
 *
 * which holds three copies of the payload at once — and the middle one is the
 * expensive surprise: `atob` returns a string containing bytes above 0x7F, so
 * Hermes cannot keep it as Latin-1 and stores it as UTF-16 at two bytes per
 * character. Peak heap is roughly 4.3× the file, plus a one-iteration-per-byte
 * loop blocking the JS thread. Fine for a 2 MB photo; fatal for a 40 MB video,
 * which is why posting a vibe worked with pictures and died with clips.
 *
 * `FileSystem.uploadAsync` streams the file from disk in native code, so the
 * bytes never enter the JS heap at all and memory is flat regardless of size.
 * It needs the Storage REST endpoint directly because supabase-js exposes no
 * streaming path.
 *
 * ── Why the format and size checks are here ─────────────────────────────────
 *
 * Both are enforced server-side by the bucket, but only *after* the bytes have
 * been sent. On Lagos mobile data that means watching a 60 MB video upload for
 * two minutes to be told it was too big. These checks read the file's size off
 * disk and fail in milliseconds, with a message that says what to do instead.
 * The server stays authoritative — a 413 or a MIME rejection coming back is
 * still translated rather than shown raw.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../config/supabase';

/**
 * Canonical MIME per extension. Deliberately limited to what the media buckets
 * allow (see migration 20260221000000 for `stories`) — anything outside this
 * map is rejected with a readable message instead of a storage error.
 *
 * Note `jpg` maps to `image/jpeg`: the old code built `image/${ext}`, which
 * produced `image/jpg` — not a real type and not in the bucket's allowlist.
 */
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heic',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  webm: 'video/webm',
};

/**
 * The extension actually stored, derived from the resolved MIME rather than
 * from the source filename, so the object's extension and its Content-Type can
 * never disagree.
 */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

/** Names a person recognises, for the "unsupported format" message. */
const FRIENDLY_BY_MIME: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'image/heic': 'HEIC',
  'video/mp4': 'MP4',
  'video/quicktime': 'MOV',
  'video/webm': 'WebM',
};

/**
 * The `stories` bucket's limit, from migration 20260221000000. Kept here as a
 * named constant so the client-side guard and the server's rejection can't
 * drift silently — if the bucket is ever widened, this is the one line to move.
 */
export const STORY_MAX_BYTES = 52_428_800; // 50 MB

export const STORY_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

/**
 * Post images. Unlike `stories`, the `social-media` bucket carries no
 * file_size_limit and no allowed_mime_types of its own — it was created with
 * just (id, name, public) in migration 20260217100000 — so these are the only
 * limits there are, and the server will not catch what slips past them.
 *
 * 10 MB matches the venue-photo ceiling in CLAUDE.md's image guidelines.
 * HEIC is included because the code this replaces accepted it; it will not
 * render in a browser, so it is worth converting on capture eventually.
 */
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const POST_IMAGE_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
] as const;

/**
 * The extension from a file URI, or null when there isn't a credible one.
 *
 * `uri.split('.').pop()` — the previous approach — returns the *entire string*
 * for a URI with no dot in it, which then became the stored file's extension.
 */
const extensionOf = (uri: string): string | null => {
  const tail = uri.split('?')[0].split('#')[0].split('/').pop() ?? '';
  const dot = tail.lastIndexOf('.');
  if (dot < 1) return null;
  const ext = tail.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : null;
};

const formatSize = (bytes: number): string => {
  const mb = bytes / 1_048_576;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
};

/** "JPEG, PNG, GIF or WebP photos, and MP4, MOV or WebM video" */
const describeAllowed = (allowed: readonly string[]): string => {
  const join = (names: string[]) =>
    names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];

  const names = (prefix: string) =>
    [...new Set(allowed.filter((m) => m.startsWith(prefix)).map((m) => FRIENDLY_BY_MIME[m] ?? m))];

  const images = names('image/');
  const videos = names('video/');

  if (images.length && videos.length) return `${join(images)} photos, and ${join(videos)} video`;
  if (images.length) return `${join(images)} photos`;
  return `${join(videos)} video`;
};

/** Turns a Storage error body into something worth showing a person. */
const storageErrorMessage = (status: number, body: string, mediaType: 'image' | 'video'): string => {
  let serverMessage = '';
  try {
    const parsed = JSON.parse(body);
    serverMessage = parsed?.message || parsed?.error || '';
  } catch {
    // Storage normally answers JSON; a proxy or gateway in the way may not.
  }

  if (status === 413) {
    return `That ${mediaType} is too large to upload. Try a shorter clip.`;
  }
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please sign in again and retry.';
  }
  if (status === 409) {
    return 'That file already exists. Please try again.';
  }
  return serverMessage
    ? `Upload rejected (${status}): ${serverMessage}`
    : `Upload failed with status ${status}.`;
};

export interface UploadMediaOptions {
  bucket: string;
  /**
   * Object path without an extension, e.g. `${user.id}/${Date.now()}`. The
   * first segment must be the user's id — every media bucket's INSERT policy
   * checks `(storage.foldername(name))[1] = auth.uid()::text`.
   */
  pathPrefix: string;
  /** A local `file://` URI, as returned by expo-image-picker. */
  fileUri: string;
  mediaType: 'image' | 'video';
  /** The picker's own mimeType, used when the extension isn't recognised. */
  pickerMimeType?: string;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}

export interface UploadedMedia {
  path: string;
  publicUrl: string;
  contentType: string;
  bytes: number;
}

/**
 * Uploads a local file and returns its public URL.
 *
 * Throws `Error`s whose `message` is written to be shown to the user as-is.
 */
export async function uploadMedia(options: UploadMediaOptions): Promise<UploadedMedia> {
  const { bucket, pathPrefix, fileUri, mediaType, pickerMimeType, maxBytes, allowedMimeTypes } =
    options;

  // getInfoAsync always reports `size` for a file that exists, so the size
  // check costs a stat rather than a read.
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error(
      `That ${mediaType} is no longer available on your device. Please pick it again.`,
    );
  }

  // Resolve the type from the extension first, because that map only ever
  // yields allowlist-shaped values; the picker's mimeType is the fallback for
  // files whose extension we don't recognise.
  const ext = extensionOf(fileUri);
  const contentType =
    (ext ? MIME_BY_EXT[ext] : undefined) ??
    pickerMimeType?.toLowerCase().split(';')[0].trim() ??
    '';

  if (!contentType || !allowedMimeTypes.includes(contentType)) {
    const what = contentType || ext || 'That file';
    // Surface-neutral: this helper serves vibes and posts, which accept
    // different sets, so the message names the set rather than the surface.
    throw new Error(
      `${what} isn't a format we can upload here. This takes ${describeAllowed(allowedMimeTypes)}.`,
    );
  }

  const size = info.size;
  if (size > maxBytes) {
    throw new Error(
      `That ${mediaType} is ${formatSize(size)}, over the ${formatSize(maxBytes)} limit. ` +
        (mediaType === 'video' ? 'Try a shorter clip.' : 'Try a smaller picture.'),
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Your session has expired. Please sign in again and retry.');
  }

  const path = `${pathPrefix}.${EXT_BY_MIME[contentType]}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`;

  // Streams from disk in native code — the file never touches the JS heap.
  const response = await FileSystem.uploadAsync(endpoint, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': contentType,
      'x-upsert': 'false',
      // supabase-js takes `cacheControl: '3600'` and sends this; the raw
      // number on its own is not a valid Cache-Control value.
      'cache-control': 'max-age=3600',
    },
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(storageErrorMessage(response.status, response.body ?? '', mediaType));
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { path, publicUrl, contentType, bytes: size };
}
