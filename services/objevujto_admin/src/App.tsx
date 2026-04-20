import { useEffect, useMemo, useState } from 'react';

type Session = {
  authenticated: boolean;
  user: { user_id: string; display_name: string; role: string; email?: string | null } | null;
  login_url: string;
  logout_url: string;
  auth_mode: string;
};

type TaxonomyItem = { id: string; slug: string; title: string; description?: string | null };

type MediaItem = { id: string; title: string; url: string; alt?: string | null };

type UserItem = { id: string; display_name: string; role: string };

type PlaceSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  short_description?: string | null;
  featured: boolean;
  status: string;
  region?: { id: string; title: string } | null;
  category?: { id: string; title: string } | null;
};

type PlaceDetail = PlaceSummary & {
  long_description?: string | null;
  hero_image?: { id: string } | null;
  author?: { id: string } | null;
  editor?: { id: string } | null;
  tags: Array<{ id: string }>;
  gallery: Array<{ id: string }>;
  related_places: Array<{ slug: string }>;
  highlights: string[];
  tips: string[];
  warnings: string[];
};

type Dashboard = {
  counts: Record<string, number>;
  status_breakdown: Array<{ status: string; count: number }>;
  recent_revisions: Array<{ id: string; action: string; entity_id: string; created_at: string }>;
};

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;

type FormState = {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  short_description: string;
  long_description: string;
  category_id: string;
  region_id: string;
  status: string;
  hero_image_id: string;
  author_id: string;
  editor_id: string;
  featured: boolean;
  tag_ids: string;
  gallery_ids: string;
  related_place_slugs: string;
  highlights: string;
  tips: string;
  warnings: string;
};

const emptyForm = (): FormState => ({
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  short_description: '',
  long_description: '',
  category_id: '',
  region_id: '',
  status: 'draft',
  hero_image_id: '',
  author_id: '',
  editor_id: '',
  featured: false,
  tag_ids: '',
  gallery_ids: '',
  related_place_slugs: '',
  highlights: '',
  tips: '',
  warnings: '',
});

function detectAdminApiBase() {
  const envBase = import.meta.env.VITE_ADMIN_API_BASE as string | undefined;
  if (envBase) return envBase.replace(/\/$/, '');
  const parts = window.location.pathname.split('/').filter(Boolean);
  const basePath = parts.length && parts[parts.length - 1] === 'admin' ? `/${parts.slice(0, -1).join('/')}` : '/objevujto';
  return `${basePath}/api/admin`;
}

const adminApiBase = detectAdminApiBase();

function parseCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseLines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  const devUser = localStorage.getItem('objevujto.devUser');
  if (devUser) {
    headers.set('X-Objevujto-Dev-User', devUser);
    headers.set('X-Objevujto-Dev-Role', localStorage.getItem('objevujto.devRole') || 'admin');
    headers.set('X-Objevujto-Dev-Email', localStorage.getItem('objevujto.devEmail') || '');
  }
  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as any).error || `Request failed: ${response.status}`);
  return payload as T;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [regions, setRegions] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [taxonomyType, setTaxonomyType] = useState<'categories' | 'regions' | 'tags'>('categories');
  const [taxonomyDraft, setTaxonomyDraft] = useState({ title: '', slug: '' });
  const [mediaDraft, setMediaDraft] = useState({ title: '', url: '', alt: '' });
  const [devLogin, setDevLogin] = useState({ user: 'local_admin', role: 'admin', email: 'dev@local' });

  const taxonomyMap = useMemo(() => ({ categories, regions, tags }), [categories, regions, tags]);

  useEffect(() => {
    bootstrap().catch((error) => {
      setNotice({ tone: 'error', text: error.message });
      setLoading(false);
    });
  }, []);

  async function bootstrap() {
    setLoading(true);
    const nextSession = await api<Session>(`${adminApiBase}/session`);
    setSession(nextSession);
    if (!nextSession.authenticated) {
      setLoading(false);
      return;
    }
    await Promise.all([loadDashboard(), loadTaxonomies(), loadMedia(), loadUsers(), loadPlaces()]);
    setLoading(false);
  }

  async function loadDashboard() {
    const payload = await api<Dashboard>(`${adminApiBase}/dashboard`);
    setDashboard(payload);
  }

  async function loadTaxonomies() {
    const [catRes, regRes, tagRes] = await Promise.all([
      api<{ items: TaxonomyItem[] }>(`${adminApiBase}/categories`),
      api<{ items: TaxonomyItem[] }>(`${adminApiBase}/regions`),
      api<{ items: TaxonomyItem[] }>(`${adminApiBase}/tags`),
    ]);
    setCategories(catRes.items);
    setRegions(regRes.items);
    setTags(tagRes.items);
  }

  async function loadMedia() {
    const payload = await api<{ items: MediaItem[] }>(`${adminApiBase}/media`);
    setMedia(payload.items);
  }

  async function loadUsers() {
    const payload = await api<{ items: UserItem[] }>(`${adminApiBase}/users`);
    setUsers(payload.items);
  }

  async function loadPlaces() {
    const payload = await api<{ items: PlaceSummary[] }>(`${adminApiBase}/places`);
    setPlaces(payload.items);
  }

  async function openPlace(placeId: string) {
    const payload = await api<{ item: PlaceDetail }>(`${adminApiBase}/places/${placeId}`);
    const item = payload.item;
    setSelectedPlace(item);
    setForm({
      id: item.id,
      title: item.title || '',
      slug: item.slug || '',
      subtitle: item.subtitle || '',
      excerpt: item.excerpt || '',
      short_description: item.short_description || '',
      long_description: item.long_description || '',
      category_id: item.category?.id || '',
      region_id: item.region?.id || '',
      status: item.status || 'draft',
      hero_image_id: item.hero_image?.id || '',
      author_id: item.author?.id || '',
      editor_id: item.editor?.id || '',
      featured: Boolean(item.featured),
      tag_ids: item.tags.map((tag) => tag.id).join(', '),
      gallery_ids: item.gallery.map((entry) => entry.id).join(', '),
      related_place_slugs: item.related_places.map((entry) => entry.slug).join(', '),
      highlights: item.highlights.join('\n'),
      tips: item.tips.join('\n'),
      warnings: item.warnings.join('\n'),
    });
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      subtitle: form.subtitle,
      excerpt: form.excerpt,
      short_description: form.short_description,
      long_description: form.long_description,
      category_id: form.category_id || null,
      region_id: form.region_id || null,
      status: form.status,
      hero_image_id: form.hero_image_id || null,
      author_id: form.author_id || null,
      editor_id: form.editor_id || null,
      featured: form.featured,
      tag_ids: parseCsv(form.tag_ids),
      gallery_ids: parseCsv(form.gallery_ids),
      related_place_slugs: parseCsv(form.related_place_slugs),
      highlights: parseLines(form.highlights),
      tips: parseLines(form.tips),
      warnings: parseLines(form.warnings),
    };
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${adminApiBase}/places/${form.id}` : `${adminApiBase}/places`;
    const response = await api<{ item: PlaceDetail }>(url, { method, body: JSON.stringify(payload) });
    setNotice({ tone: 'success', text: `Místo „${response.item.title}“ bylo uloženo.` });
    await Promise.all([loadPlaces(), loadDashboard()]);
    await openPlace(response.item.id);
  }

  async function handlePublish() {
    if (!form.id) return;
    const response = await api<{ item: PlaceDetail }>(`${adminApiBase}/places/${form.id}/publish`, { method: 'POST' });
    setNotice({ tone: 'success', text: `Místo „${response.item.title}“ bylo publikováno.` });
    await Promise.all([loadPlaces(), loadDashboard()]);
    await openPlace(response.item.id);
  }

  async function handleAddTaxonomy(event: React.FormEvent) {
    event.preventDefault();
    await api(`${adminApiBase}/${taxonomyType}`, { method: 'POST', body: JSON.stringify(taxonomyDraft) });
    setTaxonomyDraft({ title: '', slug: '' });
    setNotice({ tone: 'success', text: 'Taxonomie byla přidána.' });
    await loadTaxonomies();
  }

  async function handleAddMedia(event: React.FormEvent) {
    event.preventDefault();
    await api(`${adminApiBase}/media`, { method: 'POST', body: JSON.stringify(mediaDraft) });
    setMediaDraft({ title: '', url: '', alt: '' });
    setNotice({ tone: 'success', text: 'Médium bylo přidáno.' });
    await loadMedia();
  }

  if (loading) {
    return <div className="page-shell"><div className="loading-card">Načítám nový React admin…</div></div>;
  }

  if (!session?.authenticated) {
    return (
      <div className="page-shell auth-shell">
        <section className="hero-card">
          <div>
            <p className="eyebrow">ObjevujTo Admin</p>
            <h1>React admin pro obsahový atlas</h1>
            <p className="muted">Přechod z provizorního adminu na udržitelnější UI vrstvu.</p>
            <div className="button-row">
              <a className="button primary" href={session?.login_url}>Přihlásit přes auth.notjackal.eu</a>
            </div>
          </div>
          <form className="card form-card" onSubmit={(event) => {
            event.preventDefault();
            localStorage.setItem('objevujto.devUser', devLogin.user);
            localStorage.setItem('objevujto.devRole', devLogin.role);
            localStorage.setItem('objevujto.devEmail', devLogin.email);
            bootstrap().catch((error) => setNotice({ tone: 'error', text: error.message }));
          }}>
            <h2>Lokální dev login</h2>
            <label><span>Dev user</span><input value={devLogin.user} onChange={(event) => setDevLogin({ ...devLogin, user: event.target.value })} /></label>
            <label><span>Role</span><input value={devLogin.role} onChange={(event) => setDevLogin({ ...devLogin, role: event.target.value })} /></label>
            <label><span>E-mail</span><input value={devLogin.email} onChange={(event) => setDevLogin({ ...devLogin, email: event.target.value })} /></label>
            <button className="button secondary" type="submit">Použít dev session</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ObjevujTo Admin</p>
          <h1>Content operations cockpit</h1>
          <p className="muted">React admin nad Node/TypeScript API. Public frontend zůstává statický.</p>
        </div>
        <div className="user-chip">
          <strong>{session.user?.display_name}</strong>
          <span>{session.user?.role}</span>
          <a href={session.logout_url}>Odhlásit</a>
        </div>
      </header>

      {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}

      <section className="stats-grid">
        {dashboard && Object.entries(dashboard.counts).map(([key, value]) => (
          <article key={key} className="stat-card">
            <span>{key}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <main className="layout-grid">
        <section className="card panel-left">
          <div className="panel-head">
            <div>
              <h2>Místa</h2>
              <p className="muted">Základní editorial workflow bez page-builder nesmyslů.</p>
            </div>
            <button className="button secondary" onClick={() => { setSelectedPlace(null); setForm(emptyForm()); }}>Nové místo</button>
          </div>

          <div className="places-list">
            {places.map((place) => (
              <button key={place.id} className={`place-row ${selectedPlace?.id === place.id ? 'active' : ''}`} onClick={() => openPlace(place.id).catch((error) => setNotice({ tone: 'error', text: error.message }))}>
                <div>
                  <strong>{place.title}</strong>
                  <span>{place.slug}</span>
                </div>
                <div className="place-meta">
                  <span className={`badge ${place.status}`}>{place.status}</span>
                  <span>{place.region?.title || '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="card panel-main">
          <div className="panel-head">
            <div>
              <h2>{form.id ? 'Editor místa' : 'Nové místo'}</h2>
              <p className="muted">Použitelné, ne přeplácané. Form-first admin pro redakční obsah.</p>
            </div>
            {form.id && <button className="button secondary" onClick={() => handlePublish().catch((error) => setNotice({ tone: 'error', text: error.message }))}>Publikovat</button>}
          </div>

          <form className="editor-grid" onSubmit={handleSave}>
            <label><span>Název</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span>Slug</span><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
            <label className="span-2"><span>Podtitul</span><input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
            <label className="span-2"><span>Excerpt</span><textarea rows={2} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} /></label>
            <label className="span-2"><span>Krátký popis</span><textarea rows={3} value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></label>
            <label className="span-2"><span>Dlouhý popis</span><textarea rows={7} value={form.long_description} onChange={(event) => setForm({ ...form, long_description: event.target.value })} /></label>

            <label><span>Kategorie</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">—</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label><span>Region</span><select value={form.region_id} onChange={(event) => setForm({ ...form, region_id: event.target.value })}><option value="">—</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">draft</option><option value="review">review</option><option value="published">published</option><option value="archived">archived</option></select></label>
            <label><span>Hero image</span><select value={form.hero_image_id} onChange={(event) => setForm({ ...form, hero_image_id: event.target.value })}><option value="">—</option>{media.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label><span>Autor</span><select value={form.author_id} onChange={(event) => setForm({ ...form, author_id: event.target.value })}><option value="">—</option>{users.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
            <label><span>Editor</span><select value={form.editor_id} onChange={(event) => setForm({ ...form, editor_id: event.target.value })}><option value="">—</option>{users.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>

            <label className="checkbox-row"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> <span>Zvýrazněné místo</span></label>
            <div />
            <label className="span-2"><span>Tag IDs</span><input value={form.tag_ids} onChange={(event) => setForm({ ...form, tag_ids: event.target.value })} /></label>
            <label className="span-2"><span>Gallery IDs</span><input value={form.gallery_ids} onChange={(event) => setForm({ ...form, gallery_ids: event.target.value })} /></label>
            <label className="span-2"><span>Related slugs</span><input value={form.related_place_slugs} onChange={(event) => setForm({ ...form, related_place_slugs: event.target.value })} /></label>
            <label><span>Highlights</span><textarea rows={5} value={form.highlights} onChange={(event) => setForm({ ...form, highlights: event.target.value })} /></label>
            <label><span>Tips</span><textarea rows={5} value={form.tips} onChange={(event) => setForm({ ...form, tips: event.target.value })} /></label>
            <label className="span-2"><span>Warnings</span><textarea rows={4} value={form.warnings} onChange={(event) => setForm({ ...form, warnings: event.target.value })} /></label>

            <div className="button-row span-2">
              <button className="button primary" type="submit">Uložit</button>
              <button className="button ghost" type="button" onClick={() => { setSelectedPlace(null); setForm(emptyForm()); }}>Vyčistit</button>
            </div>
          </form>
        </section>

        <aside className="aside-stack">
          <section className="card">
            <div className="panel-head compact">
              <div>
                <h3>Taxonomie</h3>
                <p className="muted">Kategorie, regiony, tagy.</p>
              </div>
            </div>
            <div className="segmented">
              {(['categories', 'regions', 'tags'] as const).map((key) => (
                <button key={key} className={`segment ${taxonomyType === key ? 'active' : ''}`} onClick={() => setTaxonomyType(key)}>{key}</button>
              ))}
            </div>
            <div className="mini-list">
              {taxonomyMap[taxonomyType].map((item) => <div key={item.id} className="mini-row"><strong>{item.title}</strong><span>{item.slug}</span></div>)}
            </div>
            <form className="stack" onSubmit={handleAddTaxonomy}>
              <label><span>Název</span><input value={taxonomyDraft.title} onChange={(event) => setTaxonomyDraft({ ...taxonomyDraft, title: event.target.value })} /></label>
              <label><span>Slug</span><input value={taxonomyDraft.slug} onChange={(event) => setTaxonomyDraft({ ...taxonomyDraft, slug: event.target.value })} /></label>
              <button className="button secondary" type="submit">Přidat</button>
            </form>
          </section>

          <section className="card">
            <div className="panel-head compact">
              <div>
                <h3>Média</h3>
                <p className="muted">MVP správa assetů podle URL.</p>
              </div>
            </div>
            <div className="mini-list media-list">
              {media.slice(0, 8).map((item) => <div key={item.id} className="mini-row"><strong>{item.title}</strong><span>{item.id}</span></div>)}
            </div>
            <form className="stack" onSubmit={handleAddMedia}>
              <label><span>Název</span><input value={mediaDraft.title} onChange={(event) => setMediaDraft({ ...mediaDraft, title: event.target.value })} /></label>
              <label><span>URL</span><input value={mediaDraft.url} onChange={(event) => setMediaDraft({ ...mediaDraft, url: event.target.value })} /></label>
              <label><span>Alt</span><input value={mediaDraft.alt} onChange={(event) => setMediaDraft({ ...mediaDraft, alt: event.target.value })} /></label>
              <button className="button secondary" type="submit">Přidat médium</button>
            </form>
          </section>
        </aside>
      </main>
    </div>
  );
}
