const DEFAULT_API_BASE = 'https://notjackal.eu/objevujto/api/public';

export function resolveApiBase() {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('apiBase');
  if (fromQuery) {
    localStorage.setItem('objevujto.apiBase', fromQuery);
    return fromQuery.replace(/\/$/, '');
  }
  const fromWindow = window.OBJEVUJTO_API_BASE;
  if (fromWindow) return String(fromWindow).replace(/\/$/, '');
  const fromStorage = localStorage.getItem('objevujto.apiBase');
  if (fromStorage) return fromStorage.replace(/\/$/, '');
  return DEFAULT_API_BASE;
}

export const API_BASE = resolveApiBase();
export const SITE_BASE = '/objevujto';
