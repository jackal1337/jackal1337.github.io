import { getCollections, getPlaces, getSitePayload } from '../api.js';
import { collectionCard, placeCard, regionCard, renderAppShell, renderMessage, setDocumentTitle, spotlightCard } from '../render.js';

async function init() {
  renderAppShell('/');
  setDocumentTitle('Domů');

  const spotlightEl = document.querySelector('[data-featured-spotlight]');
  const featuredPlacesEl = document.querySelector('[data-featured-places]');
  const featuredCollectionsEl = document.querySelector('[data-featured-collections]');
  const featuredRegionsEl = document.querySelector('[data-featured-regions]');
  const heroTitleEl = document.querySelector('[data-hero-title]');
  const heroSubtitleEl = document.querySelector('[data-hero-subtitle]');
  const heroHighlightTitleEl = document.querySelector('[data-hero-highlight-title]');
  const heroHighlightTextEl = document.querySelector('[data-hero-highlight-text]');
  const heroHighlightLinkEl = document.querySelector('[data-hero-highlight-link]');

  renderMessage(spotlightEl, 'Načítám hlavní tip <span class="loading-dots"></span>');
  renderMessage(featuredPlacesEl, 'Načítám další místa <span class="loading-dots"></span>');
  renderMessage(featuredCollectionsEl, 'Načítám kolekce <span class="loading-dots"></span>');
  renderMessage(featuredRegionsEl, 'Načítám regiony <span class="loading-dots"></span>');

  try {
    const [sitePayload, collectionPayload, placesPayload] = await Promise.all([
      getSitePayload(),
      getCollections(),
      getPlaces({ featured: true, limit: 6 }),
    ]);

    const featuredPlaces = placesPayload.items || [];
    const [spotlight, ...rest] = featuredPlaces;

    heroTitleEl.textContent = sitePayload.homepage.hero.title;
    heroSubtitleEl.textContent = sitePayload.homepage.hero.subtitle;

    if (spotlight) {
      heroHighlightTitleEl.textContent = spotlight.title;
      heroHighlightTextEl.textContent = spotlight.excerpt || spotlight.short_description || spotlight.subtitle || 'Doporučená první zastávka pro další objevování.';
      heroHighlightLinkEl.href = `place.html?slug=${encodeURIComponent(spotlight.slug)}`;
      spotlightEl.innerHTML = spotlightCard(spotlight);
    } else {
      heroHighlightTitleEl.textContent = 'První zastávka';
      heroHighlightTextEl.textContent = 'Nová místa a doporučení budeme postupně doplňovat.';
      heroHighlightLinkEl.href = 'places.html';
      renderMessage(spotlightEl, 'Zatím bez hlavního tipu.');
    }

    featuredPlacesEl.innerHTML = rest.length
      ? rest.map(placeCard).join('')
      : '<div class="message-box">Další doporučená místa se brzy objeví tady.</div>';

    featuredCollectionsEl.innerHTML = collectionPayload.items.length
      ? collectionPayload.items.map(collectionCard).join('')
      : '<div class="message-box">Žádné kolekce zatím nejsou připravené.</div>';

    featuredRegionsEl.innerHTML = sitePayload.homepage.featured_regions.length
      ? sitePayload.homepage.featured_regions.map(regionCard).join('')
      : '<div class="message-box">Další regiony budeme postupně doplňovat.</div>';
  } catch (error) {
    const message = `Nepodařilo se načíst obsah stránky. ${error.message}`;
    renderMessage(spotlightEl, message, 'error');
    renderMessage(featuredPlacesEl, message, 'error');
    renderMessage(featuredCollectionsEl, message, 'error');
    renderMessage(featuredRegionsEl, message, 'error');
  }
}

init();
