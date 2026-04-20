import type { Request } from 'express';
import { parse as parseCookie } from 'cookie';

import type { Settings } from '../config/settings.js';
import { HttpError } from './http.js';

export interface Session {
  user_id: string;
  display_name: string;
  role: string;
  email?: string | null;
  source: 'stub' | 'forward_header';
  external_id?: string | null;
  auth_provider?: string | null;
  mapped_user_id?: string | null;
  assignment_state?: 'direct' | 'fallback' | 'unassigned';
}

export class AuthAdapter {
  constructor(private readonly settings: Settings) {}

  resolveSession(req: Request): Session | null {
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    if (this.settings.authMode === 'stub') {
      const user = req.header('X-Objevujto-Dev-User') || cookies.objevujto_dev_user;
      if (!user) return null;
      return {
        user_id: user,
        display_name: user.replaceAll('_', ' '),
        role: req.header('X-Objevujto-Dev-Role') || cookies.objevujto_dev_role || 'admin',
        email: req.header('X-Objevujto-Dev-Email') || cookies.objevujto_dev_email || null,
        source: 'stub',
        assignment_state: 'fallback',
      };
    }

    const externalId = req.header('X-Auth-User-Id') || req.header('X-Authenticated-User') || null;
    const displayName = req.header('X-Auth-User') || req.header('X-Authenticated-Name') || externalId;
    if (!externalId || !displayName) return null;

    return {
      user_id: externalId,
      external_id: externalId,
      auth_provider: 'discord',
      display_name: displayName,
      role: req.header('X-Authenticated-Role') || req.header('X-Auth-Role') || 'guest',
      email: req.header('X-Authenticated-Email') || null,
      source: 'forward_header',
      assignment_state: 'unassigned',
    };
  }

  requireSession(req: Request): Session {
    const session = this.resolveSession(req);
    if (!session) throw new HttpError(401, 'Authentication required');
    return session;
  }

  requireRole(session: Session, roles: string[]) {
    if (!roles.includes(session.role)) {
      throw new HttpError(403, 'Insufficient permissions');
    }
  }

  loginUrl(returnTo: string): string {
    return `${this.settings.authBaseUrl.replace(/\/$/, '')}/api/auth/login?redirect_url=${encodeURIComponent(returnTo)}`;
  }

  logoutUrl(returnTo: string): string {
    return `${this.settings.authBaseUrl.replace(/\/$/, '')}/api/auth/logout-redirect?redirect=${encodeURIComponent(returnTo)}`;
  }
}
