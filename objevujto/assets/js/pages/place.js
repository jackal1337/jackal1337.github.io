import { getPlace } from '../api.js';
import { breadcrumbs, detailFact, listItems, optimizedImageUrl, placeCard, renderAppShell, renderMessage, richText, setDocumentTitle } from '../render.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

async function init() {
  renderAppShell();
  const heroEl = document.querySelector('[data-place-hero]');
  const contentEl = document.querySelector('[data-place-content]');

  if (!slug) {
    renderMessage(heroEl, 'Chybí odkaz na konkrétní místo.', 'error');
    return;
  }

  renderMessage(heroEl, 'Načítám stránku místa <span class="loading-dots"></span>');

  try {
    const payload = await getPlace(slug);
    const { item } = payload;
    setDocumentTitle(item.title);

    heroEl.innerHTML = `
      ${breadcrumbs(payload.breadcrumbs)}
      <div class="detail-hero">
        <div class="detail-hero__copy">
          <span class="eyebrow">Místo</span>
          <h1>${item.title}</h1>
          <p class="detail-hero__lead">${item.subtitle || item.excerpt || ''}</p>
          <div class="meta-pills">
            ${item.region ? `<a class="pill pill--region" href="/objevujto/places.html?region=${encodeURIComponent(item.region.slug)}">${item.region.title}</a>` : ''}
            ${item.category ? `<a class="pill pill--muted" href="/objevujto/places.html?category=${encodeURIComponent(item.category.slug)}">${item.category.title}</a>` : ''}
            ${(item.tags || []).map((tag) => `<a class="pill pill--muted" href="/objevujto/places.html?tag=${encodeURIComponent(tag.slug)}">#${tag.title}</a>`).join('')}
          </div>
          <div class="detail-facts detail-facts--inline">
            ${detailFact('Status', item.status)}
            ${detailFact('Autor', item.author?.display_name || '—')}
            ${detailFact('Aktualizace', item.updated_at || '—')}
          </div>
        </div>
        <div class="detail-hero__media">
          ${item.hero_image?.url ? `<img src="${optimizedImageUrl(item.hero_image.url)}" alt="${item.hero_image.alt || item.title}" fetchpriority="high" decoding="async">` : ''}
        </div>
      </div>
    `;

    contentEl.innerHTML = `
      <div class="detail-content-grid">
        <div class="section-stack">
          <section class="detail-section detail-section--intro">
            <h2>Přehled místa</h2>
            <div class="rich-text">${richText(item.long_description || item.short_description || '')}</div>
          </section>
          <div class="detail-panels-grid">
            <section class="detail-section detail-section--tone">
              <h3>Co stojí za pozornost</h3>
              ${listItems(item.highlights)}
            </section>
            <section class="detail-section detail-section--tone">
              <h3>Tipy na návštěvu</h3>
              ${listItems(item.tips)}
            </section>
          </div>
          <section class="detail-section detail-section--warning">
            <h3>Na co si dát pozor</h3>
            ${item.warnings?.length ? listItems(item.warnings) : '<p class="muted">Bez zvláštních varování.</p>'}
          </section>
          <section class="detail-section">
            <div class="section-head section-head--compact">
              <div>
                <h2>Galerie</h2>
                <p>Další pohledy a detaily, které dokreslují atmosféru místa.</p>
              </div>
            </div>
            ${item.gallery?.length ? `<div class="gallery-grid">${item.gallery.map((media) => `<figure><img src="${optimizedImageUrl(media.url)}" alt="${media.alt || media.title || item.title}" loading="lazy" decoding="async"><figcaption>${media.title || ''}</figcaption></figure>`).join('')}</div>` : '<p class="muted">Galerie zatím obsahuje jen hlavní fotografii.</p>'}
          </section>
        </div>
        <aside class="section-stack">
          <section class="detail-section detail-section--aside">
            <h3>Rychlá fakta</h3>
            <div class="detail-facts">
              ${detailFact('Region', item.region?.title || '—')}
              ${detailFact('Kategorie', item.category?.title || '—')}
              ${detailFact('Editor', item.editor?.display_name || '—')}
              ${detailFact('Publikováno', item.published_at || '—')}
            </div>
          </section>
          <section class="detail-section detail-section--aside">
            <h3>Související místa</h3>
            <div class="related-grid">
              ${item.related_places?.length ? item.related_places.map(placeCard).join('') : '<p class="muted">Zatím bez souvisejících míst.</p>'}
            </div>
          </section>
        </aside>
      </div>
    `;
  } catch (error) {
    renderMessage(heroEl, `Nepodařilo se načíst stránku místa. ${error.message}`, 'error');
    contentEl.innerHTML = '';
  }
}

init();
