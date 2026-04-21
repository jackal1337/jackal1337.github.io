import { getCategories, getPlaces, getRegions, getTags } from '../api.js';
import { activeFilterPills, listingSection, placeCard, renderAppShell, renderMessage, setDocumentTitle } from '../render.js';

const params = new URLSearchParams(window.location.search);
const CORE_SLUGS = ['montgomery', 'blueberry', 'palomino-creek'];

function setFilters(form, categories, regions, tags) {
  const fill = (name, items) => {
    form.elements[name].innerHTML = `<option value="">Vše</option>${items.map((item) => `<option value="${item.slug}">${item.title}</option>`).join('')}`;
    form.elements[name].value = params.get(name) || '';
  };
  form.elements.q.value = params.get('q') || '';
  fill('category', categories.items);
  fill('region', regions.items);
  fill('tag', tags.items);
}

function applyGroupFilter(items, group) {
  if (group === 'core-towns') return items.filter((place) => CORE_SLUGS.includes(place.slug));
  if (group === 'others') return items.filter((place) => !CORE_SLUGS.includes(place.slug));
  return items;
}

function groupedListingHtml(items, group) {
  if (group === 'core-towns') {
    return `<div class="card-grid">${items.map(placeCard).join('')}</div>`;
  }
  if (group === 'others') {
    return listingSection(
      'Další části San Andreas',
      'Los Santos, San Fierro, Las Venturas, Fort Carson, Dillimore a další zastávky mimo hlavní trojici.',
      items.map(placeCard).join(''),
    );
  }

  const core = items.filter((place) => CORE_SLUGS.includes(place.slug));
  const others = items.filter((place) => !CORE_SLUGS.includes(place.slug));
  return `
    ${core.length ? listingSection('Montgomery, Blueberry a Palomino Creek', 'Tři hlavní obce, které fungují jako nejpřirozenější vstup do ObjevujTo.', core.map(placeCard).join('')) : ''}
    ${others.length ? listingSection('Další části San Andreas', 'Společný blok pro další města, zastávky a lokality mimo hlavní trojici.', others.map(placeCard).join('')) : ''}
  `;
}

async function loadPlaces() {
  const listEl = document.querySelector('[data-places-list]');
  const summaryEl = document.querySelector('[data-places-summary]');
  const activeFiltersEl = document.querySelector('[data-active-filters]');
  const form = document.querySelector('[data-filters-form]');
  const group = params.get('group') || '';
  renderMessage(listEl, 'Načítám místa <span class="loading-dots"></span>');

  try {
    const requestParams = Object.fromEntries(params.entries());
    delete requestParams.group;
    const [categories, regions, tags, places] = await Promise.all([
      getCategories(),
      getRegions(),
      getTags(),
      getPlaces(requestParams),
    ]);

    const filteredItems = applyGroupFilter(places.items, group);
    setFilters(form, categories, regions, tags);
    summaryEl.textContent = `${filteredItems.length} míst odpovídá aktuálnímu výběru.`;
    activeFiltersEl.innerHTML = activeFilterPills({ ...places.filters, group });
    listEl.innerHTML = filteredItems.length
      ? groupedListingHtml(filteredItems, group)
      : '<div class="message-box">Tomuto výběru zatím neodpovídá žádné publikované místo.</div>';
  } catch (error) {
    renderMessage(listEl, `Nepodařilo se načíst přehled míst. ${error.message}`, 'error');
  }
}

function bindFilters() {
  const form = document.querySelector('[data-filters-form]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    ['q', 'category', 'region', 'tag'].forEach((key) => {
      const value = form.elements[key].value.trim();
      if (value) next.set(key, value);
    });
    window.location.search = next.toString();
  });
}

function init() {
  renderAppShell('/places');
  setDocumentTitle('Místa');
  bindFilters();
  loadPlaces();
}

init();
