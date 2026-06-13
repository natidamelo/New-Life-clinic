/**
 * Safely sanitizes image/photo URLs to ensure base64 strings or overly large payloads
 * are not passed to Velt, which causes 413 (Content Too Large) errors.
 */
export const sanitizePhotoUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // 1. Remove obvious data URIs or blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  
  // 2. Reject excessively long strings (a typical URL/path is < 300 chars; base64 strings are much larger)
  if (url.length > 500) return null;
  
  // 3. Ensure it starts with a valid scheme or path prefix
  const isWebUrl = url.startsWith('http://') || url.startsWith('https://');
  const isRelativePath = url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
  
  if (!isWebUrl && !isRelativePath) {
    // If it doesn't look like http/https or a local path, check if it's a simple image filename
    // e.g. "avatar.png", "user_image.jpg". If not, reject.
    const isSimpleFilename = /^[a-zA-Z0-9_\-.]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url);
    if (!isSimpleFilename) return null;
  }
  
  return url;
};
