import { getPlace } from '../api.js';
import { breadcrumbs, detailFact, listItems, optimizedImageUrl, placeCard, renderAppShell, renderMessage, richText, setDocumentTitle } from '../render.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

function deriveVisitSummary(item) {
  const tone = [];
  if (item.region?.title) tone.push(`patří do oblasti ${item.region.title}`);
  if (item.category?.title) tone.push(`spadá mezi ${item.category.title.toLowerCase()}`);
  if (item.tags?.length) tone.push(`nejvíc vyniká tématy ${item.tags.slice(0, 2).map((tag) => tag.title).join(' a ')}`);
  if (!tone.length) return 'Místo, které stojí za klidnější zastávku a vlastní objevování.';
  return `Místo, které ${tone.join(', ')}.`;
}

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
    const visitSummary = deriveVisitSummary(item);
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
            <div class="section-head section-head--compact">
              <div>
                <span class="eyebrow eyebrow--soft">První dojem</span>
                <h2>Proč sem jít</h2>
              </div>
            </div>
            <p class="guide-intro">${visitSummary}</p>
            <div class="rich-text">${richText(item.long_description || item.short_description || '')}</div>
          </section>
          <div class="detail-panels-grid">
            <section class="detail-section detail-section--tone">
              <div class="section-head section-head--compact">
                <div>
                  <span class="eyebrow eyebrow--soft">To hlavní</span>
                  <h3>Co stojí za pozornost</h3>
                </div>
              </div>
              ${listItems(item.highlights)}
            </section>
            <section class="detail-section detail-section--tone">
              <div class="section-head section-head--compact">
                <div>
                  <span class="eyebrow eyebrow--soft">Na cestu</span>
                  <h3>Tipy na návštěvu</h3>
                </div>
              </div>
              ${listItems(item.tips)}
            </section>
          </div>
          <section class="detail-section detail-section--warning">
            <div class="section-head section-head--compact">
              <div>
                <span class="eyebrow eyebrow--soft">Pozor</span>
                <h3>Na co myslet předem</h3>
              </div>
            </div>
            ${item.warnings?.length ? listItems(item.warnings) : '<p class="muted">Bez zvláštních varování.</p>'}
          </section>
          <section class="detail-section">
            <div class="section-head section-head--compact">
              <div>
                <span class="eyebrow eyebrow--soft">Další pohledy</span>
                <h2>Galerie</h2>
                <p>Další záběry a detaily, které pomáhají nasát atmosféru místa ještě před cestou.</p>
              </div>
            </div>
            ${item.gallery?.length ? `<div class="gallery-grid">${item.gallery.map((media) => `<figure><img src="${optimizedImageUrl(media.url)}" alt="${media.alt || media.title || item.title}" loading="lazy" decoding="async"><figcaption>${media.title || ''}</figcaption></figure>`).join('')}</div>` : '<p class="muted">Galerie zatím obsahuje jen hlavní fotografii.</p>'}
          </section>
        </div>
        <aside class="section-stack">
          <section class="detail-section detail-section--aside">
            <div class="section-head section-head--compact">
              <div>
                <span class="eyebrow eyebrow--soft">Rychlá orientace</span>
                <h3>Přehled</h3>
              </div>
            </div>
            <div class="detail-facts">
              ${detailFact('Region', item.region?.title || '—')}
              ${detailFact('Kategorie', item.category?.title || '—')}
              ${detailFact('Editor', item.editor?.display_name || '—')}
              ${detailFact('Publikováno', item.published_at || '—')}
            </div>
          </section>
          <section class="detail-section detail-section--aside">
            <div class="section-head section-head--compact">
              <div>
                <span class="eyebrow eyebrow--soft">Pokračuj dál</span>
                <h3>Související místa</h3>
              </div>
            </div>
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
