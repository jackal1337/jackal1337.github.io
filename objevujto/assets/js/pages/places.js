import { getCategories, getPlaces, getRegions, getTags } from '../api.js';
import { activeFilterPills, placeCard, renderAppShell, renderMessage, setDocumentTitle } from '../render.js';

const params = new URLSearchParams(window.location.search);

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

async function loadPlaces() {
  const listEl = document.querySelector('[data-places-list]');
  const summaryEl = document.querySelector('[data-places-summary]');
  const activeFiltersEl = document.querySelector('[data-active-filters]');
  const form = document.querySelector('[data-filters-form]');
  renderMessage(listEl, 'Načítám místa <span class="loading-dots"></span>');

  try {
    const [categories, regions, tags, places] = await Promise.all([
      getCategories(),
      getRegions(),
      getTags(),
      getPlaces(Object.fromEntries(params.entries())),
    ]);

    setFilters(form, categories, regions, tags);
    summaryEl.textContent = `${places.pagination.total} míst odpovídá aktuálnímu výběru.`;
    activeFiltersEl.innerHTML = activeFilterPills(places.filters);
    listEl.innerHTML = places.items.length
      ? places.items.map(placeCard).join('')
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
