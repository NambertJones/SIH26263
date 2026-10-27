import type { User } from '../types';

/** Mask a valid 12-digit APAAR ID as 1234-****-9012. Malformed values are shown as-is so they can be corrected. */
export function maskApaar(apaar?: string | null): string {
  if (!apaar) return '';
  const v = apaar.trim();
  return /^\d{12}$/.test(v) ? `${v.slice(0, 4)}-****-${v.slice(-4)}` : v;
}

/** AICTE-side users: verification officers, or an AICTE admin (admin role with no institution). */
export function isCentralUser(user?: Pick<User, 'role' | 'institution_id'> | null): boolean {
  if (!user) return false;
  return user.role === 'reviewer' || (user.role === 'admin' && !user.institution_id);
}
