import { getClinicTenantId } from './authToken';

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

/** Velt org must match across all staff — use clinic slug, not a hardcoded fallback. */
export const getVeltOrganizationId = (user?: { clinicId?: string } | null): string => {
  if (user?.clinicId?.trim()) return user.clinicId.trim();
  try {
    const stored = localStorage.getItem('clinic_branding_data');
    if (stored) {
      const branding = JSON.parse(stored);
      const slug = branding?.slug?.trim();
      if (slug && slug !== 'default') return slug;
    }
  } catch { /* ignore */ }
  const tenant = getClinicTenantId();
  if (tenant && tenant !== 'default') return tenant;
  return 'new-life';
};

export const buildVeltUser = (user: {
  id?: string;
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  photo?: string;
  clinicId?: string;
}) => {
  const userId = String(user.id || user._id || '');
  const name =
    user.name ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.username ||
    'User';
  return {
    userId,
    name,
    email: user.email,
    photoUrl: sanitizePhotoUrl(user.profileImage || user.photo || null),
    organizationId: getVeltOrganizationId(user),
  };
};

export const buildVeltContacts = (
  users: Array<{
    id?: string;
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    profileImage?: string;
    photo?: string;
  }>
) =>
  users
    .map((u) => {
      const userId = String(u.id || u._id || '');
      if (!userId) return null;
      return {
        userId,
        name:
          u.name ||
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          u.username ||
          'User',
        email: u.email,
        photoUrl: sanitizePhotoUrl(u.profileImage || u.photo || null),
      };
    })
    .filter(Boolean) as Array<{
    userId: string;
    name: string;
    email?: string;
    photoUrl: string | null;
  }>;
