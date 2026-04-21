import { SITE_BASE } from './config.js';

const OPTIMIZED_IMAGE_MAP = new Map([
  [`${SITE_BASE}/assets/img/img-blueberry/blueberry.jpg`, `${SITE_BASE}/assets/img/optimized/blueberry-1600.webp`],
  [`${SITE_BASE}/assets/img/img-blueberry/bb1.jpg`, `${SITE_BASE}/assets/img/optimized/blueberry-detail-1280.webp`],
  [`${SITE_BASE}/assets/img/img-montgomery/montgomery.jpg`, `${SITE_BASE}/assets/img/optimized/montgomery-1600.webp`],
  [`${SITE_BASE}/assets/img/img-montgomery/mg1.jpg`, `${SITE_BASE}/assets/img/optimized/montgomery-detail-1280.webp`],
  [`${SITE_BASE}/assets/img/img-palomino/palomino.jpg`, `${SITE_BASE}/assets/img/optimized/palomino-1600.webp`],
  [`${SITE_BASE}/assets/img/img-palomino/pc1.jpg`, `${SITE_BASE}/assets/img/optimized/palomino-detail-1280.webp`],
  [`${SITE_BASE}/assets/img/map.jpg`, `${SITE_BASE}/assets/img/optimized/map-1600.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-blueberry/blueberry.jpg', `${SITE_BASE}/assets/img/optimized/blueberry-1600.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-blueberry/bb1.jpg', `${SITE_BASE}/assets/img/optimized/blueberry-detail-1280.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-montgomery/montgomery.jpg', `${SITE_BASE}/assets/img/optimized/montgomery-1600.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-montgomery/mg1.jpg', `${SITE_BASE}/assets/img/optimized/montgomery-detail-1280.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-palomino/palomino.jpg', `${SITE_BASE}/assets/img/optimized/palomino-1600.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/img-palomino/pc1.jpg', `${SITE_BASE}/assets/img/optimized/palomino-detail-1280.webp`],
  ['https://jackal1337.github.io/objevujto/assets/img/map.jpg', `${SITE_BASE}/assets/img/optimized/map-1600.webp`],
]);

export function optimizedImageUrl(url = '') {
  return OPTIMIZED_IMAGE_MAP.get(url) || url;
}

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
          <span class="brand-copy">
            <strong>ObjevujTo</strong>
            <small>atlas San Andreas</small>
          </span>
        </a>
        <nav class="nav-links" aria-label="Hlavní navigace">
          <a class="nav-link ${activePath === '/' ? 'is-active' : ''}" href="${SITE_BASE}/index.html">Domů</a>
          <a class="nav-link ${activePath === '/places' ? 'is-active' : ''}" href="${SITE_BASE}/places.html">Místa</a>
          <a class="nav-link ${activePath === '/legacy' ? 'is-active' : ''}" href="${SITE_BASE}/index_.html">Archiv</a>
        </nav>
      </div>
    `;
  }
  if (footer) {
    footer.innerHTML = `
      <div class="site-shell footer-panel">
        <div>
          <strong>ObjevujTo</strong>
          <p>Obsahový atlas a průvodce po San Andreas. Inspirace pro objevování zajímavých míst, regionů a výletních zastávek.</p>
        </div>
        <div class="footer-links">
          <a href="${SITE_BASE}/places.html">Procházet místa</a>
          <a href="${SITE_BASE}/index_.html">Archiv původní verze</a>
        </div>
      </div>
    `;
  }
}

export function renderMessage(container, message, tone = 'neutral') {
  container.innerHTML = `<div class="message-box" data-tone="${tone}">${message}</div>`;
}

export function placeCard(place) {
  const imageUrl = optimizedImageUrl(place.hero_image?.url || '');
  return `
    <article class="surface-card place-card">
      <a class="surface-card__media" href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">
        ${imageUrl ? `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(place.hero_image?.alt || place.title)}" loading="lazy" decoding="async">` : ''}
        <span class="card-badge">${escapeHtml(place.region?.title || 'Místo')}</span>
      </a>
      <div class="surface-card__body">
        <div class="meta-pills">
          ${place.category ? `<span class="pill pill--muted">${escapeHtml(place.category.title)}</span>` : ''}
          <span class="pill pill--muted">${escapeHtml(place.status)}</span>
        </div>
        <div class="card-heading">
          <h3><a href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">${escapeHtml(place.title)}</a></h3>
          ${place.subtitle ? `<p>${escapeHtml(place.subtitle)}</p>` : ''}
        </div>
        <p class="card-copy">${escapeHtml(place.excerpt || place.short_description || '')}</p>
        <div class="card-footer-row">
          ${place.tags?.length ? `<div class="meta-pills card-tag-row">${place.tags.slice(0, 3).map((tag) => `<a class="pill pill--muted" href="${SITE_BASE}/places.html?tag=${encodeURIComponent(tag.slug)}">#${escapeHtml(tag.title)}</a>`).join('')}</div>` : '<span></span>'}
          <a class="card-link" href="${SITE_BASE}/place.html?slug=${encodeURIComponent(place.slug)}">Detail →</a>
        </div>
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
  return `<a class="pill pill--region" href="${SITE_BASE}/places.html?region=${encodeURIComponent(region.slug)}">${escapeHtml(region.title)}</a>`;
}

export function listItems(items) {
  if (!items?.length) return '<p class="muted">Zatím bez položek.</p>';
  return `<ul class="list-block">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
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
