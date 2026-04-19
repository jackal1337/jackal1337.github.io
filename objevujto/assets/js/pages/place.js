import { getPlace } from '../api.js';
import { breadcrumbs, listItems, placeCard, renderAppShell, renderMessage, richText, setDocumentTitle } from '../render.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function init() {
  renderAppShell();
  const heroEl = document.querySelector('[data-place-hero]');
  const contentEl = document.querySelector('[data-place-content]');

  if (!slug) {
    renderMessage(heroEl, 'Chybí parametr <code>slug</code> v URL.', 'error');
    return;
  }

  renderMessage(heroEl, 'Načítám detail místa <span class="loading-dots"></span>');

  try {
    const payload = await getPlace(slug);
    const { item } = payload;
    setDocumentTitle(item.title);

    heroEl.innerHTML = `
      ${breadcrumbs(payload.breadcrumbs)}
      <div class="page-hero">
        <div class="detail-layout">
          <div class="hero-panel">
            <div>
              <span class="eyebrow">Místo</span>
              <h1>${item.title}</h1>
              <p>${item.subtitle || item.excerpt || ''}</p>
              <div class="meta-pills">
                ${item.region ? `<a class="pill" href="/objevujto/places.html?region=${encodeURIComponent(item.region.slug)}">${item.region.title}</a>` : ''}
                ${item.category ? `<a class="pill pill--muted" href="/objevujto/places.html?category=${encodeURIComponent(item.category.slug)}">${item.category.title}</a>` : ''}
                ${(item.tags || []).map((tag) => `<a class="pill pill--muted" href="/objevujto/places.html?tag=${encodeURIComponent(tag.slug)}">#${tag.title}</a>`).join('')}
              </div>
            </div>
            <div class="hero-media">
              ${item.hero_image?.url ? `<img src="${item.hero_image.url}" alt="${item.hero_image.alt || item.title}">` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    contentEl.innerHTML = `
      <div class="detail-layout">
        <div class="section-stack">
          <section class="detail-section">
            <h2>Přehled</h2>
            <div class="rich-text">${richText(item.long_description || item.short_description || '')}</div>
          </section>
          <section class="detail-section">
            <h2>Highlights</h2>
            ${listItems(item.highlights)}
          </section>
          <section class="detail-section">
            <h2>Tipy</h2>
            ${listItems(item.tips)}
          </section>
          <section class="detail-section">
            <h2>Varování</h2>
            ${item.warnings?.length ? listItems(item.warnings) : '<p class="muted">Bez zvláštních varování.</p>'}
          </section>
          <section class="detail-section">
            <h2>Galerie</h2>
            ${item.gallery?.length ? `<div class="gallery-grid">${item.gallery.map((media) => `<figure><img src="${media.url}" alt="${media.alt || media.title || item.title}"><figcaption>${media.title || ''}</figcaption></figure>`).join('')}</div>` : '<p class="muted">Galerie zatím obsahuje jen hero médium.</p>'}
          </section>
        </div>
        <aside class="section-stack">
          <section class="detail-section">
            <h3>Metadata</h3>
            <ul class="list-block">
              <li>Status: ${item.status}</li>
              <li>Autor: ${item.author?.display_name || '—'}</li>
              <li>Editor: ${item.editor?.display_name || '—'}</li>
              <li>Poslední aktualizace: ${item.updated_at || '—'}</li>
            </ul>
          </section>
          <section class="detail-section">
            <h3>Související místa</h3>
            <div class="card-grid">
              ${item.related_places?.length ? item.related_places.map(placeCard).join('') : '<p class="muted">Zatím bez souvisejících míst.</p>'}
            </div>
          </section>
          <section class="detail-section">
            <h3>Redakční poznámky</h3>
            ${item.editorial_notes?.length ? `<ul class="list-block">${item.editorial_notes.map((note) => `<li>${note.note}</li>`).join('')}</ul>` : '<p class="muted">Žádné interní poznámky.</p>'}
          </section>
        </aside>
      </div>
    `;
  } catch (error) {
    renderMessage(heroEl, `Nepodařilo se načíst detail místa. ${error.message}`, 'error');
    contentEl.innerHTML = '';
  }
}

init();
