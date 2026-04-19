import { getCollections, getPlaces, getSitePayload } from '../api.js';
import { renderAppShell, renderMessage, placeCard, collectionCard, regionPill, setDocumentTitle } from '../render.js';

async function init() {
  renderAppShell('/');
  setDocumentTitle('Domů');

  const featuredPlacesEl = document.querySelector('[data-featured-places]');
  const featuredCollectionsEl = document.querySelector('[data-featured-collections]');
  const featuredRegionsEl = document.querySelector('[data-featured-regions]');

  renderMessage(featuredPlacesEl, 'Načítám doporučená místa <span class="loading-dots"></span>');
  renderMessage(featuredCollectionsEl, 'Načítám kolekce <span class="loading-dots"></span>');
  renderMessage(featuredRegionsEl, 'Načítám regiony <span class="loading-dots"></span>');

  try {
    const [sitePayload, collectionPayload, placesPayload] = await Promise.all([
      getSitePayload(),
      getCollections(),
      getPlaces({ featured: true, limit: 6 })
    ]);

    document.querySelector('[data-hero-title]').textContent = sitePayload.homepage.hero.title;
    document.querySelector('[data-hero-subtitle]').textContent = sitePayload.homepage.hero.subtitle;

    featuredPlacesEl.innerHTML = placesPayload.items.length
      ? placesPayload.items.map(placeCard).join('')
      : '<div class="message-box">Žádná zvýrazněná místa zatím nejsou publikována.</div>';

    featuredCollectionsEl.innerHTML = collectionPayload.items.length
      ? collectionPayload.items.map(collectionCard).join('')
      : '<div class="message-box">Žádné kolekce zatím nejsou připravené.</div>';

    featuredRegionsEl.innerHTML = sitePayload.homepage.featured_regions.length
      ? sitePayload.homepage.featured_regions.map(regionPill).join('')
      : '<div class="message-box">Regiony budou doplněny spolu s backendem.</div>';
  } catch (error) {
    const message = `Nepodařilo se načíst veřejná data. ${error.message}`;
    renderMessage(featuredPlacesEl, message, 'error');
    renderMessage(featuredCollectionsEl, message, 'error');
    renderMessage(featuredRegionsEl, message, 'error');
  }
}

init();
