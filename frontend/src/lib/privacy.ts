import type { User } from '../types';

/**
 * Mask an APAAR ID to its last 4 digits (XXXX-XXXX-9012). The API already sends masked values;
 * this is a safety net so a raw value is never rendered by mistake.
 */
export function maskApaar(apaar?: string | null): string {
  if (!apaar) return '';
  const v = apaar.trim();
  if (/^\d{12}$/.test(v)) return `XXXX-XXXX-${v.slice(-4)}`;
  if (/^\d+$/.test(v)) return `Invalid format (${v.length} chars)`;
  return v; // already masked by the server
}

/** AICTE-side users: verification officers, or an AICTE admin (admin role with no institution). */
export function isCentralUser(user?: Pick<User, 'role' | 'institution_id'> | null): boolean {
  if (!user) return false;
  return user.role === 'reviewer' || (user.role === 'admin' && !user.institution_id);
}
