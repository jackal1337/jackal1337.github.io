import { API_BASE, SITE_BASE } from './config.js';

export function setDocumentTitle(title) {
  document.title = title ? `${title} · ObjevujTo` : 'ObjevujTo';
}

export function renderAppShell(activePath = '/') {
  const nav = document.querySelector('[data-site-nav]');
  const footer = document.querySelector('[data-site-footer]');
  if (nav) {
    nav.innerHTML = `
      <div class="site-shell site-nav__inner">
        <a class="brand" href="${SITE_BASE}/index.html">
          <img src="${SITE_BASE}/assets/img/logo.png" alt="ObjevujTo logo">
          <span>ObjevujTo</span>
        </a>
        <nav class="nav-links" aria-label="Hlavní navigace">
          <a class="nav-link ${activePath === '/' ? 'is-active' : ''}" href="${SITE_BASE}/index.html">Domů</a>
          <a class="nav-link ${activePath === '/places' ? 'is-active' : ''}" href="${SITE_BASE}/places.html">Místa</a>
          <a class="nav-link ${activePath === '/legacy' ? 'is-active' : ''}" href="${SITE_BASE}/index_.html">Legacy demo</a>
        </nav>
      </div>
    `;
  }
  if (footer) {
    footer.innerHTML = `
      <div class="site-shell footer-panel surface-card">
        <div>
          <strong>ObjevujTo</strong>
          <p>Statický frontend na GitHub Pages, napojený na externí JSON API.</p>
        </div>
        <div>
          <p>Aktivní API base:</p>
          <code>${escapeHtml(API_BASE)}</code>
        </div>
      </div>
    `;
  }
}

export function renderMessage(container, message, tone = 'neutral') {
  container.innerHTML = `<div class="message-box" data-tone="${tone}">${message}</div>`;
}

export function placeCard(place) {
  return `
    <article class="surface-card">
      <a class="surface-card__media" href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">
        ${place.hero_image?.url ? `<img src="${escapeAttribute(place.hero_image.url)}" alt="${escapeAttribute(place.hero_image.alt || place.title)}">` : ''}
      </a>
      <div class="surface-card__body">
        <div class="meta-pills">
          ${place.region ? `<span class="pill">${escapeHtml(place.region.title)}</span>` : ''}
          ${place.category ? `<span class="pill pill--muted">${escapeHtml(place.category.title)}</span>` : ''}
          <span class="pill pill--muted">${escapeHtml(place.status)}</span>
        </div>
        <div>
          <h3><a href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">${escapeHtml(place.title)}</a></h3>
          ${place.subtitle ? `<p>${escapeHtml(place.subtitle)}</p>` : ''}
        </div>
        <p>${escapeHtml(place.excerpt || place.short_description || '')}</p>
        ${place.tags?.length ? `<div class="meta-pills">${place.tags.map((tag) => `<a class="pill pill--muted" href="${SITE_BASE}/places.html?tag=${encodeURIComponent(tag.slug)}">#${escapeHtml(tag.title)}</a>`).join('')}</div>` : ''}
      </div>
    </article>
  `;
}

export function collectionCard(collection) {
  return `
    <article class="surface-card collection-card">
      <div class="meta-pills"><span class="pill">Kolekce</span></div>
      <h3>${escapeHtml(collection.title)}</h3>
      <p>${escapeHtml(collection.description || '')}</p>
      <ul>
        ${collection.places.map((place) => `<li><a href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">${escapeHtml(place.title)}</a></li>`).join('')}
      </ul>
    </article>
  `;
}

export function regionPill(region) {
  return `<a class="pill" href="${SITE_BASE}/places.html?region=${encodeURIComponent(region.slug)}">${escapeHtml(region.title)}</a>`;
}

export function listItems(items, tone = 'muted') {
  if (!items?.length) return '<p class="muted">Zatím bez položek.</p>';
  return `<ul class="list-block">${items.map((item) => `<li class="${tone === 'warning' ? 'warning' : ''}">${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function richText(paragraphs) {
  return paragraphs
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
}

export function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map((item) => `<span><a href="${escapeAttribute(item.href)}">${escapeHtml(item.title)}</a></span>`).join('')}</nav>`;
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value);
}
