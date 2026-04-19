import { API_BASE } from './config.js';

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function getSitePayload() {
  return fetchJson('/site');
}

export function getPlaces(params = {}) {
  const url = new URL(`${API_BASE}/places`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return fetch(url.toString()).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
    return payload;
  });
}

export function getPlace(slug) {
  return fetchJson(`/places/${slug}`);
}

export function getCategories() {
  return fetchJson('/categories');
}

export function getRegions() {
  return fetchJson('/regions');
}

export function getTags() {
  return fetchJson('/tags');
}

export function getCollections() {
  return fetchJson('/collections');
}
