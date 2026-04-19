const state = {
  selectedPlaceId: null,
  taxonomyType: 'categories',
  session: null,
  taxonomies: { categories: [], regions: [], tags: [] },
  media: [],
  users: [],
  places: []
};

const qs = (selector) => document.querySelector(selector);
const byName = (form, name) => form.elements.namedItem(name);

function devHeaders() {
  const user = localStorage.getItem('objevujto.devUser');
  const role = localStorage.getItem('objevujto.devRole') || 'admin';
  const email = localStorage.getItem('objevujto.devEmail') || '';
  return user ? { 'X-Objevujto-Dev-User': user, 'X-Objevujto-Dev-Role': role, 'X-Objevujto-Dev-Email': email } : {};
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...devHeaders(), ...(options.headers || {}) },
    credentials: 'include',
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function renderSession() {
  const box = qs('#session-box');
  if (!state.session?.authenticated) {
    box.innerHTML = `
      <strong>Admin shell je chráněný.</strong>
      <p class="muted">Pro plné použití přihlaste relaci přes externí auth.</p>
      <p><a href="${state.session?.login_url || '#'}">Přejít na login</a></p>
      <details>
        <summary>Lokální dev přihlášení</summary>
        <form id="dev-login-form" class="form-stack" style="margin-top:.75rem">
          <label><span>Dev user</span><input name="user" value="local_admin"></label>
          <label><span>Role</span><input name="role" value="admin"></label>
          <label><span>E-mail</span><input name="email" value="dev@local"></label>
          <button class="primary-button" type="submit">Použít dev relaci</button>
        </form>
      </details>
    `;
    const devForm = document.querySelector('#dev-login-form');
    if (devForm) {
      devForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        localStorage.setItem('objevujto.devUser', devForm.elements.user.value.trim());
        localStorage.setItem('objevujto.devRole', devForm.elements.role.value.trim() || 'admin');
        localStorage.setItem('objevujto.devEmail', devForm.elements.email.value.trim());
        await bootstrap();
      });
    }
    return;
  }
  box.innerHTML = `
    <strong>${state.session.user.display_name}</strong>
    <p class="muted">Role: ${state.session.user.role}</p>
    <p class="muted">Auth mód: ${state.session.auth_mode}</p>
    <p><a href="${state.session.logout_url}">Odhlásit</a></p>
  `;
}

function renderDashboard(payload) {
  const grid = qs('#dashboard-grid');
  grid.innerHTML = Object.entries(payload.counts)
    .map(([key, value]) => `<article class="stat"><strong>${value}</strong><span>${key}</span></article>`)
    .join('');

  qs('#status-breakdown').innerHTML = payload.status_breakdown
    .map((item) => `<li><span class="badge ${item.status}">${item.status}</span> ${item.count}</li>`)
    .join('');

  qs('#recent-revisions').innerHTML = payload.recent_revisions.length
    ? payload.recent_revisions.map((item) => `<li><strong>${item.action}</strong> · ${item.entity_id}<br><span class="muted">${item.created_at}</span></li>`).join('')
    : '<li>Zatím bez revizí.</li>';
}

function renderPlaces() {
  const container = qs('#places-table');
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Název</th>
          <th>Region</th>
          <th>Status</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${state.places.map((place) => `
          <tr>
            <td><strong>${place.title}</strong><br><span class="muted">${place.slug}</span></td>
            <td>${place.region?.title || '—'}</td>
            <td><span class="badge ${place.status}">${place.status}</span></td>
            <td><button class="ghost-button" data-edit-place="${place.id}">Upravit</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderTaxonomy() {
  const items = state.taxonomies[state.taxonomyType] || [];
  qs('#taxonomy-list').innerHTML = items.length
    ? items.map((item) => `<li><strong>${item.title}</strong><br><span class="muted">${item.slug}</span></li>`).join('')
    : '<li>Bez položek.</li>';
}

function renderMedia() {
  qs('#media-list').innerHTML = state.media.length
    ? state.media.map((item) => `<li><strong>${item.title}</strong><a href="${item.url}" target="_blank" rel="noreferrer">${item.url}</a><span class="muted">${item.id}</span></li>`).join('')
    : '<li>Bez médií.</li>';
}

function updateSelectOptions() {
  const form = qs('#place-form');
  const setOptions = (name, items, getLabel = (item) => item.title) => {
    byName(form, name).innerHTML = `<option value="">—</option>${items.map((item) => `<option value="${item.id}">${getLabel(item)}</option>`).join('')}`;
  };
  setOptions('category_id', state.taxonomies.categories);
  setOptions('region_id', state.taxonomies.regions);
  setOptions('hero_image_id', state.media, (item) => `${item.title} (${item.id})`);
  setOptions('author_id', state.users, (item) => `${item.display_name} (${item.role})`);
  setOptions('editor_id', state.users, (item) => `${item.display_name} (${item.role})`);
}

function resetPlaceForm() {
  const form = qs('#place-form');
  form.reset();
  byName(form, 'id').value = '';
  qs('#place-preview').textContent = 'Vyberte nebo vytvořte místo.';
  state.selectedPlaceId = null;
}

function fillPlaceForm(item) {
  const form = qs('#place-form');
  state.selectedPlaceId = item.id;
  byName(form, 'id').value = item.id;
  byName(form, 'title').value = item.title || '';
  byName(form, 'slug').value = item.slug || '';
  byName(form, 'subtitle').value = item.subtitle || '';
  byName(form, 'excerpt').value = item.excerpt || '';
  byName(form, 'short_description').value = item.short_description || '';
  byName(form, 'long_description').value = item.long_description || '';
  byName(form, 'category_id').value = item.category?.id || '';
  byName(form, 'region_id').value = item.region?.id || '';
  byName(form, 'status').value = item.status || 'draft';
  byName(form, 'hero_image_id').value = item.hero_image?.id || '';
  byName(form, 'author_id').value = item.author?.id || '';
  byName(form, 'editor_id').value = item.editor?.id || '';
  byName(form, 'featured').checked = Boolean(item.featured);
  byName(form, 'tag_ids').value = (item.tags || []).map((tag) => tag.id).join(', ');
  byName(form, 'gallery_ids').value = (item.gallery || []).map((media) => media.id).join(', ');
  byName(form, 'related_place_slugs').value = (item.related_places || []).map((place) => place.slug).join(', ');
  byName(form, 'highlights').value = (item.highlights || []).join('\n');
  byName(form, 'tips').value = (item.tips || []).join('\n');
  byName(form, 'warnings').value = (item.warnings || []).join('\n');
  qs('#place-preview').textContent = JSON.stringify(item, null, 2);
}

function formToPayload() {
  const form = qs('#place-form');
  const list = (name) => byName(form, name).value.split(',').map((item) => item.trim()).filter(Boolean);
  const multiline = (name) => byName(form, name).value.split('\n').map((item) => item.trim()).filter(Boolean);
  return {
    id: byName(form, 'id').value || undefined,
    title: byName(form, 'title').value.trim(),
    slug: byName(form, 'slug').value.trim() || undefined,
    subtitle: byName(form, 'subtitle').value.trim(),
    excerpt: byName(form, 'excerpt').value.trim(),
    short_description: byName(form, 'short_description').value.trim(),
    long_description: byName(form, 'long_description').value.trim(),
    category_id: byName(form, 'category_id').value || null,
    region_id: byName(form, 'region_id').value || null,
    status: byName(form, 'status').value,
    hero_image_id: byName(form, 'hero_image_id').value || null,
    author_id: byName(form, 'author_id').value || null,
    editor_id: byName(form, 'editor_id').value || null,
    featured: byName(form, 'featured').checked,
    tag_ids: list('tag_ids'),
    gallery_ids: list('gallery_ids'),
    related_place_slugs: list('related_place_slugs'),
    highlights: multiline('highlights'),
    tips: multiline('tips'),
    warnings: multiline('warnings')
  };
}

async function loadSession() {
  state.session = await request('/api/admin/session');
  renderSession();
}

async function loadDashboard() {
  if (!state.session?.authenticated) return;
  renderDashboard(await request('/api/admin/dashboard', { headers: devHeaders() }));
}

async function loadTaxonomies() {
  if (!state.session?.authenticated) return;
  const [categories, regions, tags] = await Promise.all([
    request('/api/admin/categories', { headers: devHeaders() }),
    request('/api/admin/regions', { headers: devHeaders() }),
    request('/api/admin/tags', { headers: devHeaders() })
  ]);
  state.taxonomies = { categories: categories.items, regions: regions.items, tags: tags.items };
  renderTaxonomy();
  updateSelectOptions();
}

async function loadMedia() {
  if (!state.session?.authenticated) return;
  state.media = (await request('/api/admin/media', { headers: devHeaders() })).items;
  renderMedia();
  updateSelectOptions();
}

async function loadUsers() {
  if (!state.session?.authenticated) return;
  state.users = (await request('/api/admin/users', { headers: devHeaders() })).items;
  updateSelectOptions();
}

async function loadPlaces() {
  if (!state.session?.authenticated) return;
  state.places = (await request('/api/admin/places', { headers: devHeaders() })).items;
  renderPlaces();
}

async function openPlace(placeId) {
  const payload = await request(`/api/admin/places/${placeId}`, { headers: devHeaders() });
  fillPlaceForm(payload.item);
}

async function bootstrap() {
  try {
    await loadSession();
    if (!state.session?.authenticated) return;
    await Promise.all([loadUsers(), loadTaxonomies(), loadMedia(), loadPlaces(), loadDashboard()]);
  } catch (error) {
    alert(error.message);
  }
}

qs('#refresh-dashboard').addEventListener('click', () => loadDashboard().catch((error) => alert(error.message)));
qs('#new-place').addEventListener('click', resetPlaceForm);
qs('#reset-place-form').addEventListener('click', resetPlaceForm);
qs('#refresh-preview').addEventListener('click', async () => {
  if (!state.selectedPlaceId) return;
  try {
    await openPlace(state.selectedPlaceId);
  } catch (error) {
    alert(error.message);
  }
});
qs('#publish-place').addEventListener('click', async () => {
  if (!state.selectedPlaceId) return alert('Nejprve vyberte místo.');
  try {
    await request(`/api/admin/places/${state.selectedPlaceId}/publish`, { method: 'POST', headers: devHeaders() });
    await Promise.all([loadPlaces(), loadDashboard()]);
    await openPlace(state.selectedPlaceId);
  } catch (error) {
    alert(error.message);
  }
});
qs('#places-table').addEventListener('click', (event) => {
  const target = event.target.closest('[data-edit-place]');
  if (!target) return;
  openPlace(target.dataset.editPlace).catch((error) => alert(error.message));
});
qsAll('.tab-button').forEach((button) => {
  button.addEventListener('click', () => {
    qsAll('.tab-button').forEach((item) => item.classList.toggle('is-active', item === button));
    state.taxonomyType = button.dataset.taxonomy;
    renderTaxonomy();
  });
});
qs('#taxonomy-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const payload = {
      title: form.elements.title.value.trim(),
      slug: form.elements.slug.value.trim() || undefined
    };
    await request(`/api/admin/${state.taxonomyType}`, { method: 'POST', headers: devHeaders(), body: JSON.stringify(payload) });
    form.reset();
    await loadTaxonomies();
  } catch (error) {
    alert(error.message);
  }
});
qs('#media-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const form = event.currentTarget;
    const payload = {
      title: form.elements.title.value.trim(),
      url: form.elements.url.value.trim(),
      alt: form.elements.alt.value.trim()
    };
    await request('/api/admin/media', { method: 'POST', headers: devHeaders(), body: JSON.stringify(payload) });
    form.reset();
    await loadMedia();
  } catch (error) {
    alert(error.message);
  }
});
qs('#place-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = formToPayload();
    const targetPath = state.selectedPlaceId ? `/api/admin/places/${state.selectedPlaceId}` : '/api/admin/places';
    const method = state.selectedPlaceId ? 'PUT' : 'POST';
    const response = await request(targetPath, { method, headers: devHeaders(), body: JSON.stringify(payload) });
    fillPlaceForm(response.item);
    await Promise.all([loadPlaces(), loadDashboard()]);
  } catch (error) {
    alert(error.message);
  }
});

function qsAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

bootstrap();
