import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  ClipboardCheck,
  Users,
  CopyCheck,
  AlertOctagon,
  Scale,
  BarChart3,
  ScrollText,
  UserCog,
  Network,
  Building2,
  Landmark,
  FileBadge,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import type { User } from '../types';
import { isCentralUser } from './privacy';

/**
 * Personas mapped from the backend roles:
 *  - inst_admin: college admin (role admin + institution)
 *  - operator: college staff who validate and review records (role institution_user)
 *  - oversight: review officer (role reviewer)
 *  - central_admin: platform admin (role admin, no institution)
 */
export type Persona = 'inst_admin' | 'operator' | 'oversight' | 'central_admin';

export function personaOf(user?: User | null): Persona | null {
  if (!user) return null;
  if (user.role === 'reviewer') return 'oversight';
  if (user.role === 'institution_user') return 'operator';
  return isCentralUser(user) ? 'central_admin' : 'inst_admin';
}

export const PERSONA_LABEL: Record<Persona, string> = {
  inst_admin: 'Institution Admin',
  operator: 'College Staff',
  oversight: 'Oversight Reviewer',
  central_admin: 'Platform Admin',
};

export interface NavItem {
  path: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  roles: Persona[];
  /** Short explanation shown under the page title. */
  description?: string;
}

const ALL: Persona[] = ['inst_admin', 'operator', 'oversight', 'central_admin'];
const INSTITUTION: Persona[] = ['inst_admin', 'operator'];
const icon = (I: React.ElementType) => <I className="w-4 h-4" aria-hidden="true" />;

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Overview', section: 'Overview', icon: icon(LayoutDashboard), roles: ALL },

  { path: '/upload', label: 'Bulk Import', section: 'Data intake', icon: icon(UploadCloud), roles: INSTITUTION, description: 'Upload, map and validate a CSV/XLSX file' },
  { path: '/validation', label: 'Validation Centre', section: 'Data intake', icon: icon(ClipboardCheck), roles: ALL },
  { path: '/students', label: 'Student Records', section: 'Data intake', icon: icon(Users), roles: ALL },

  { path: '/duplicates', label: 'Duplicate Review', section: 'Review', icon: icon(CopyCheck), roles: ALL, description: 'Possible duplicate records — human review required' },
  { path: '/cases', label: 'Cases', section: 'Review', icon: icon(AlertOctagon), roles: ALL },
  { path: '/oversight', label: 'Review Monitoring', section: 'Review', icon: icon(Eye), roles: ['inst_admin', 'oversight', 'central_admin'], description: 'Decisions, escalations and recurring data problems' },
  { path: '/intake', label: 'Intake Reconciliation', section: 'Review', icon: icon(Scale), roles: ALL, description: 'Enrolled counts compared with the intake reference' },

  { path: '/reports', label: 'Reports & Exports', section: 'Reporting', icon: icon(BarChart3), roles: ALL },
  { path: '/audit', label: 'Audit Trail', section: 'Reporting', icon: icon(ScrollText), roles: ['inst_admin', 'oversight', 'central_admin'] },

  { path: '/institutions', label: 'Institution Registry', section: 'Administration', icon: icon(Landmark), roles: ['oversight', 'central_admin'] },
  { path: '/settings', label: 'Institution & Programmes', section: 'Administration', icon: icon(Building2), roles: ['inst_admin'] },
  { path: '/users', label: 'Users & Roles', section: 'Administration', icon: icon(UserCog), roles: ['inst_admin', 'central_admin'] },
  { path: '/rules', label: 'Validation Rules', section: 'Administration', icon: icon(SlidersHorizontal), roles: ALL, description: 'Checks applied to uploaded files' },
  { path: '/integrations', label: 'Integrations & Sources', section: 'Administration', icon: icon(Network), roles: ALL },
  { path: '/certificate', label: 'Enrolment Record', section: 'Administration', icon: icon(FileBadge), roles: ['inst_admin', 'oversight', 'central_admin'] },
];

/** Pages reached from other pages rather than the sidebar. */
const EXTRA_TITLES: { match: RegExp; label: string; parent: string }[] = [
  { match: /^\/mapping/, label: 'Map Columns', parent: '/upload' },
  { match: /^\/students\/[^/]+$/, label: 'Student Record', parent: '/students' },
];

export function visibleNav(user?: User | null): NavItem[] {
  const p = personaOf(user);
  return p ? NAV_ITEMS.filter((i) => i.roles.includes(p)) : [];
}

export function canAccess(user: User | null | undefined, path: string): boolean {
  const item = NAV_ITEMS.find((i) => path === i.path || path.startsWith(i.path + '/'));
  if (!item) return true; // detail pages are checked by the backend
  const p = personaOf(user);
  return !!p && item.roles.includes(p);
}

export interface Crumb {
  label: string;
  path?: string;
}

/** Title and breadcrumb trail for the current route. */
export function routeMeta(pathname: string): { title: string; description?: string; crumbs: Crumb[] } {
  const extra = EXTRA_TITLES.find((e) => e.match.test(pathname));
  if (extra) {
    const parent = NAV_ITEMS.find((i) => i.path === extra.parent);
    return {
      title: extra.label,
      crumbs: [
        { label: parent?.section || 'Home' },
        { label: parent?.label || '', path: extra.parent },
        { label: extra.label },
      ],
    };
  }
  const item = NAV_ITEMS.find((i) => pathname === i.path || pathname.startsWith(i.path + '/'));
  if (!item) return { title: 'APAAR ReconX', crumbs: [] };
  return {
    title: item.label,
    description: item.description,
    crumbs: item.section === item.label ? [{ label: item.label }] : [{ label: item.section }, { label: item.label }],
  };
}
