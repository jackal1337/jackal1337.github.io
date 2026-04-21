import { getCollections, getPlaces, getSitePayload } from '../api.js';
import { collectionCard, gatewayCard, placeCard, renderAppShell, renderMessage, setDocumentTitle, spotlightCard } from '../render.js';

const CORE_SLUGS = ['montgomery', 'blueberry', 'palomino-creek'];

function gatewayEntries(places) {
  const bySlug = new Map(places.map((place) => [place.slug, place]));
  const montgomery = bySlug.get('montgomery');
  const blueberry = bySlug.get('blueberry');
  const palomino = bySlug.get('palomino-creek');
  const others = places.filter((place) => !CORE_SLUGS.includes(place.slug));

  return [
    montgomery && {
      kicker: 'Red County',
      title: 'Montgomery',
      text: 'Klíčová obec Red County a přirozený první orientační bod pro další cestu po regionu.',
      href: `place.html?slug=${encodeURIComponent(montgomery.slug)}`,
      image: montgomery.hero_image?.url,
      alt: montgomery.hero_image?.alt,
      linkLabel: 'Otevřít Montgomery →',
    },
    blueberry && {
      kicker: 'Red County',
      title: 'Blueberry',
      text: 'Industriálnější obec se silným provozem, službami a vlastní atmosférou.',
      href: `place.html?slug=${encodeURIComponent(blueberry.slug)}`,
      image: blueberry.hero_image?.url,
      alt: blueberry.hero_image?.alt,
      linkLabel: 'Otevřít Blueberry →',
    },
    palomino && {
      kicker: 'Red County',
      title: 'Palomino Creek',
      text: 'Klidnější zastávka pro pomalejší objevování a lokální tipy.',
      href: `place.html?slug=${encodeURIComponent(palomino.slug)}`,
      image: palomino.hero_image?.url,
      alt: palomino.hero_image?.alt,
      linkLabel: 'Otevřít Palomino Creek →',
    },
    {
      kicker: 'Další části SA',
      title: 'Los Santos, San Fierro, Las Venturas a další',
      text: 'Společný rozcestník pro další části San Andreas – města, menší zastávky i místa mimo hlavní trojici.',
      href: 'places.html?group=others',
      image: others[0]?.hero_image?.url || `${window.location.origin}/objevujto/assets/img/map.jpg`,
      alt: 'Další části San Andreas',
      linkLabel: 'Projít další části →',
    },
  ].filter(Boolean);
}

async function init() {
  renderAppShell('/');
  setDocumentTitle('Domů');

  const gatewaysEl = document.querySelector('[data-home-gateways]');
  const spotlightEl = document.querySelector('[data-featured-spotlight]');
  const featuredPlacesEl = document.querySelector('[data-featured-places]');
  const featuredCollectionsEl = document.querySelector('[data-featured-collections]');
  const heroTitleEl = document.querySelector('[data-hero-title]');
  const heroSubtitleEl = document.querySelector('[data-hero-subtitle]');

  renderMessage(gatewaysEl, 'Načítám hlavní rozcestníky <span class="loading-dots"></span>');
  renderMessage(spotlightEl, 'Načítám doporučené místo <span class="loading-dots"></span>');
  renderMessage(featuredPlacesEl, 'Načítám další místa <span class="loading-dots"></span>');
  renderMessage(featuredCollectionsEl, 'Načítám kolekce <span class="loading-dots"></span>');

  try {
    const [sitePayload, collectionPayload, placesPayload] = await Promise.all([
      getSitePayload(),
      getCollections(),
      getPlaces({ limit: 12 }),
    ]);

    const places = placesPayload.items || [];
    const spotlight = places.find((place) => CORE_SLUGS.includes(place.slug)) || places[0];
    const sidePlaces = places.filter((place) => place.slug !== spotlight?.slug).slice(0, 3);

    heroTitleEl.textContent = sitePayload.homepage.hero.title;
    heroSubtitleEl.textContent = 'Začni v jedné ze tří hlavních obcí, nebo se vydej rovnou do dalších částí San Andreas.';

    gatewaysEl.innerHTML = gatewayEntries(places).map(gatewayCard).join('');

    spotlightEl.innerHTML = spotlight
      ? spotlightCard(spotlight)
      : '<div class="message-box">Zatím bez doporučeného místa.</div>';

    featuredPlacesEl.innerHTML = sidePlaces.length
      ? sidePlaces.map(placeCard).join('')
      : '<div class="message-box">Další doporučená místa se brzy objeví tady.</div>';

    featuredCollectionsEl.innerHTML = collectionPayload.items.length
      ? collectionPayload.items.map(collectionCard).join('')
      : '<div class="message-box">Žádné kolekce zatím nejsou připravené.</div>';
  } catch (error) {
    const message = `Nepodařilo se načíst obsah stránky. ${error.message}`;
    renderMessage(gatewaysEl, message, 'error');
    renderMessage(spotlightEl, message, 'error');
    renderMessage(featuredPlacesEl, message, 'error');
    renderMessage(featuredCollectionsEl, message, 'error');
  }
}

init();
