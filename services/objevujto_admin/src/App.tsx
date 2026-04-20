import { useEffect, useMemo, useState } from 'react';

type Session = {
  authenticated: boolean;
  user: { user_id: string; display_name: string; role: string; email?: string | null; external_id?: string | null; mapped_user_id?: string | null; assignment_state?: 'direct' | 'fallback' | 'unassigned'; source?: 'stub' | 'forward_header' } | null;
  login_url: string;
  logout_url: string;
  auth_mode: string;
};

type TaxonomyItem = { id: string; slug: string; title: string; description?: string | null };

type MediaItem = { id: string; title: string; url: string; alt?: string | null };

type UserItem = { id: string; display_name: string; role: string };

type AuthIdentity = {
  id: string;
  provider: string;
  external_id: string;
  user_id: string;
  role_override?: string | null;
  display_name?: string;
  role?: string;
};

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

type EditorTab = 'content' | 'meta' | 'relations';

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

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function badgeTone(status: string): string {
  switch (status) {
    case 'published': return 'published';
    case 'review': return 'review';
    case 'archived': return 'archived';
    default: return 'draft';
  }
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
  const [authIdentities, setAuthIdentities] = useState<AuthIdentity[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [taxonomyType, setTaxonomyType] = useState<'categories' | 'regions' | 'tags'>('categories');
  const [taxonomyDraft, setTaxonomyDraft] = useState({ title: '', slug: '' });
  const [mediaDraft, setMediaDraft] = useState({ title: '', url: '', alt: '' });
  const [identityDraft, setIdentityDraft] = useState({ external_id: '', user_id: '', role_override: '' });
  const [devLogin, setDevLogin] = useState({ user: 'local_admin', role: 'admin', email: 'dev@local' });
  const [placeQuery, setPlaceQuery] = useState('');
  const [editorTab, setEditorTab] = useState<EditorTab>('content');

  const taxonomyMap = useMemo(() => ({ categories, regions, tags }), [categories, regions, tags]);
  const filteredPlaces = useMemo(() => {
    const query = placeQuery.trim().toLowerCase();
    if (!query) return places;
    return places.filter((place) =>
      [place.title, place.slug, place.subtitle, place.region?.title, place.category?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [placeQuery, places]);
  const statusSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of dashboard?.status_breakdown || []) map.set(item.status, item.count);
    return map;
  }, [dashboard]);

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
    await Promise.all([loadDashboard(), loadTaxonomies(), loadMedia(), loadUsers(), loadPlaces(), loadAuthIdentities()]);
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

  async function loadAuthIdentities() {
    if (session?.user?.role !== 'admin') return;
    const payload = await api<{ items: AuthIdentity[] }>(`${adminApiBase}/auth-identities`);
    setAuthIdentities(payload.items);
  }

  async function handleAddIdentity(event: React.FormEvent) {
    event.preventDefault();
    await api(`${adminApiBase}/auth-identities`, {
      method: 'POST',
      body: JSON.stringify({
        provider: 'discord',
        external_id: identityDraft.external_id,
        user_id: identityDraft.user_id,
        role_override: identityDraft.role_override || null,
      }),
    });
    setIdentityDraft({ external_id: '', user_id: '', role_override: '' });
    setNotice({ tone: 'success', text: 'Mapování přístupu bylo uloženo.' });
    await loadAuthIdentities();
  }

  async function openPlace(placeId: string) {
    const payload = await api<{ item: PlaceDetail }>(`${adminApiBase}/places/${placeId}`);
    const item = payload.item;
    setSelectedPlace(item);
    setEditorTab('content');
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

  function startNewPlace() {
    setSelectedPlace(null);
    setForm(emptyForm());
    setEditorTab('content');
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

  const quickStats = [
    { label: 'Místa', value: dashboard?.counts.places ?? 0, detail: `${statusSummary.get('published') ?? 0} publikováno` },
    { label: 'Taxonomie', value: (dashboard?.counts.categories ?? 0) + (dashboard?.counts.regions ?? 0) + (dashboard?.counts.tags ?? 0), detail: 'kategorie, regiony, tagy' },
    { label: 'Média', value: dashboard?.counts.media ?? 0, detail: 'asset knihovna' },
  ];

  if (loading) {
    return <div className="page-shell"><div className="loading-card">Načítám nový redakční cockpit…</div></div>;
  }

  if (!session?.authenticated) {
    return (
      <div className="page-shell auth-shell">
        <section className="auth-layout">
          <div className="auth-hero card">
            <p className="eyebrow">ObjevujTo Admin</p>
            <h1>Redakční cockpit pro atlas San Andreas</h1>
            <p className="lead">Nový React admin už není jen nouzový scaffold. Cíl je rychlá práce s místy, taxonomií a workflow, bez page-builder bordelu.</p>
            <div className="auth-pill-row">
              <span className="soft-pill">Places workflow</span>
              <span className="soft-pill">Taxonomie</span>
              <span className="soft-pill">Media library</span>
              <span className="soft-pill">Preview-ready základ</span>
            </div>
            <div className="button-row auth-actions">
              <a className="button primary" href={session?.login_url}>Přihlásit přes auth.notjackal.eu</a>
            </div>
          </div>
          <form
            className="card auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              localStorage.setItem('objevujto.devUser', devLogin.user);
              localStorage.setItem('objevujto.devRole', devLogin.role);
              localStorage.setItem('objevujto.devEmail', devLogin.email);
              bootstrap().catch((error) => setNotice({ tone: 'error', text: error.message }));
            }}
          >
            <div>
              <h2>Lokální dev login</h2>
              <p className="muted">Pro rychlé ověření UI bez reálné session.</p>
            </div>
            <label><span>Dev user</span><input value={devLogin.user} onChange={(event) => setDevLogin({ ...devLogin, user: event.target.value })} /></label>
            <label><span>Role</span><input value={devLogin.role} onChange={(event) => setDevLogin({ ...devLogin, role: event.target.value })} /></label>
            <label><span>E-mail</span><input value={devLogin.email} onChange={(event) => setDevLogin({ ...devLogin, email: event.target.value })} /></label>
            <button className="button secondary" type="submit">Použít dev session</button>
          </form>
        </section>
      </div>
    );
  }

  if (session.user?.role === 'guest') {
    return (
      <div className="page-shell auth-shell">
        <section className="auth-layout">
          <div className="auth-hero card">
            <p className="eyebrow">ObjevujTo Admin</p>
            <h1>Přihlášení proběhlo, ale účet ještě není přiřazený</h1>
            <p className="lead">Tvoje auth session je validní, ale v ObjevujTo zatím nemáš přiřazenou interní roli. Potřebuješ mapování Discord identity na lokálního uživatele.</p>
            <div className="auth-pill-row">
              <span className="soft-pill accent">external id: {session.user?.external_id || '—'}</span>
              <span className="soft-pill">stav: {session.user?.assignment_state || 'unassigned'}</span>
            </div>
          </div>
          <div className="card auth-form">
            <h2>Co teď</h2>
            <p className="muted">Admin musí přidat mapování identity do ObjevujTo access layer. Po přiřazení stačí refresh.</p>
            <div className="mini-list">
              <div className="mini-row"><strong>Discord identity</strong><span>{session.user?.external_id || '—'}</span></div>
              <div className="mini-row"><strong>Zobrazené jméno</strong><span>{session.user?.display_name || '—'}</span></div>
              <div className="mini-row"><strong>Logout</strong><a href={session.logout_url}>Odhlásit</a></div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">OT</div>
          <div>
            <p className="eyebrow">ObjevujTo</p>
            <h1>Admin</h1>
          </div>
        </div>

        <section className="sidebar-section">
          <div className="sidebar-head">
            <h2>Content</h2>
            <button className="button secondary small" onClick={startNewPlace}>Nové</button>
          </div>
          <label className="search-field">
            <span>Hledat místa</span>
            <input placeholder="název, slug, region…" value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} />
          </label>
          <div className="place-count">{filteredPlaces.length} / {places.length} míst</div>
          <div className="places-list compact-scroll">
            {filteredPlaces.map((place) => (
              <button
                key={place.id}
                className={`place-row ${selectedPlace?.id === place.id ? 'active' : ''}`}
                onClick={() => openPlace(place.id).catch((error) => setNotice({ tone: 'error', text: error.message }))}
              >
                <div>
                  <strong>{place.title}</strong>
                  <span>{place.slug}</span>
                </div>
                <div className="place-meta">
                  <span className={`badge ${badgeTone(place.status)}`}>{place.status}</span>
                  <span>{place.region?.title || '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="sidebar-section session-card">
          <h3>Session</h3>
          <strong>{session.user?.display_name}</strong>
          <span className="muted">Role: {session.user?.role}</span>
          <a href={session.logout_url}>Odhlásit</a>
        </section>
      </aside>

      <div className="workspace">
        <header className="workspace-hero card">
          <div>
            <p className="eyebrow">React admin · Node API</p>
            <h2>{selectedPlace ? selectedPlace.title : 'Připrav nové místo'}</h2>
            <p className="lead subtle">
              {selectedPlace
                ? selectedPlace.subtitle || selectedPlace.excerpt || 'Vybrané místo připravené k editaci.'
                : 'Použitelnější redakční rozhraní pro ObjevujTo: obsah, metadata, vztahy a workflow na jednom místě.'}
            </p>
            <div className="hero-meta-row">
              {selectedPlace ? (
                <>
                  <span className={`badge ${badgeTone(form.status)}`}>{form.status}</span>
                  {selectedPlace.region && <span className="soft-pill">{selectedPlace.region.title}</span>}
                  {selectedPlace.category && <span className="soft-pill">{selectedPlace.category.title}</span>}
                  {selectedPlace.featured && <span className="soft-pill accent">featured</span>}
                </>
              ) : (
                <>
                  <span className="soft-pill accent">content atlas</span>
                  <span className="soft-pill">workflow ready</span>
                  <span className="soft-pill">plain public frontend</span>
                </>
              )}
            </div>
          </div>
          <div className="hero-metrics">
            {quickStats.map((stat) => (
              <article key={stat.label} className="metric-card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.detail}</small>
              </article>
            ))}
          </div>
        </header>

        {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}

        <main className="workspace-grid">
          <section className="editor-column card">
            <div className="panel-head">
              <div>
                <h2>{form.id ? 'Editor místa' : 'Nové místo'}</h2>
                <p className="muted">Od perexu až po vztahy mezi místy. Žádné ručně psané HTML stránky jako zdroj pravdy.</p>
              </div>
              <div className="button-row">
                {form.id && <button className="button secondary" onClick={() => handlePublish().catch((error) => setNotice({ tone: 'error', text: error.message }))}>Publikovat</button>}
                <button className="button ghost" onClick={startNewPlace}>Vyčistit</button>
              </div>
            </div>

            <div className="editor-tabs">
              {([
                ['content', 'Obsah'],
                ['meta', 'Metadata'],
                ['relations', 'Vztahy'],
              ] as Array<[EditorTab, string]>).map(([tab, label]) => (
                <button key={tab} className={`segment ${editorTab === tab ? 'active' : ''}`} onClick={() => setEditorTab(tab)}>{label}</button>
              ))}
            </div>

            <form className="editor-grid polished" onSubmit={handleSave}>
              {editorTab === 'content' && (
                <>
                  <label><span>Název</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                  <label><span>Slug</span><input placeholder="vygeneruje se při vytvoření" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
                  <label className="span-2"><span>Podtitul</span><input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
                  <label className="span-2"><span>Excerpt / listing perex</span><textarea rows={2} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} /></label>
                  <label className="span-2"><span>Krátký popis</span><textarea rows={3} value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></label>
                  <label className="span-2"><span>Dlouhý popis</span><textarea rows={8} value={form.long_description} onChange={(event) => setForm({ ...form, long_description: event.target.value })} /></label>
                  <label><span>Highlights</span><textarea rows={5} value={form.highlights} onChange={(event) => setForm({ ...form, highlights: event.target.value })} /></label>
                  <label><span>Tipy</span><textarea rows={5} value={form.tips} onChange={(event) => setForm({ ...form, tips: event.target.value })} /></label>
                  <label className="span-2"><span>Varování</span><textarea rows={4} value={form.warnings} onChange={(event) => setForm({ ...form, warnings: event.target.value })} /></label>
                </>
              )}

              {editorTab === 'meta' && (
                <>
                  <label><span>Kategorie</span><select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">—</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label><span>Region</span><select value={form.region_id} onChange={(event) => setForm({ ...form, region_id: event.target.value })}><option value="">—</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">draft</option><option value="review">review</option><option value="published">published</option><option value="archived">archived</option></select></label>
                  <label><span>Hero image</span><select value={form.hero_image_id} onChange={(event) => setForm({ ...form, hero_image_id: event.target.value })}><option value="">—</option>{media.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                  <label><span>Autor</span><select value={form.author_id} onChange={(event) => setForm({ ...form, author_id: event.target.value })}><option value="">—</option>{users.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
                  <label><span>Editor</span><select value={form.editor_id} onChange={(event) => setForm({ ...form, editor_id: event.target.value })}><option value="">—</option>{users.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
                  <label className="checkbox-tile span-2"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /><span>Zvýrazněné místo pro homepage a kolekce</span></label>
                  <label className="span-2"><span>Tag IDs</span><input placeholder="tag_prumysl, tag_gastro" value={form.tag_ids} onChange={(event) => setForm({ ...form, tag_ids: event.target.value })} /></label>
                </>
              )}

              {editorTab === 'relations' && (
                <>
                  <label className="span-2"><span>Gallery IDs</span><input placeholder="media_blueberry_detail" value={form.gallery_ids} onChange={(event) => setForm({ ...form, gallery_ids: event.target.value })} /></label>
                  <label className="span-2"><span>Related slugs</span><input placeholder="montgomery, palomino-creek" value={form.related_place_slugs} onChange={(event) => setForm({ ...form, related_place_slugs: event.target.value })} /></label>
                  <div className="hint-panel span-2">
                    <h3>Redakční tip</h3>
                    <p>Vztahy drž záměrně úzké. Místo by mělo mít jasné sousedy a logické návaznosti, ne generický seznam všeho.</p>
                  </div>
                </>
              )}

              <div className="save-bar span-2">
                <div>
                  <strong>{form.title || 'Nepojmenované místo'}</strong>
                  <span>Poslední lokální změny ještě nejsou uložené do API.</span>
                </div>
                <button className="button primary" type="submit">Uložit změny</button>
              </div>
            </form>
          </section>

          <aside className="inspector-column">
            <section className="card overview-card">
              <div className="panel-head compact">
                <div>
                  <h3>Přehled workflow</h3>
                  <p className="muted">Kde teď redakce stojí.</p>
                </div>
              </div>
              <div className="status-stack">
                {['draft', 'review', 'published', 'archived'].map((status) => (
                  <div key={status} className="status-row">
                    <span className={`badge ${badgeTone(status)}`}>{status}</span>
                    <strong>{statusSummary.get(status) ?? 0}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="panel-head compact">
                <div>
                  <h3>Poslední aktivita</h3>
                  <p className="muted">Rychlý signál, co se v obsahu děje.</p>
                </div>
              </div>
              <div className="mini-list compact-scroll short">
                {(dashboard?.recent_revisions || []).slice(0, 6).map((item) => (
                  <div key={item.id} className="mini-row revision-row">
                    <strong>{item.action}</strong>
                    <span>{item.entity_id}</span>
                    <small>{formatTimestamp(item.created_at)}</small>
                  </div>
                ))}
                {!dashboard?.recent_revisions?.length && <div className="empty-state">Zatím bez revizí.</div>}
              </div>
            </section>

            <section className="card">
              <div className="panel-head compact">
                <div>
                  <h3>Taxonomie</h3>
                  <p className="muted">Kategorie, regiony a tagy bez přepínání do jiné appky.</p>
                </div>
              </div>
              <div className="segmented">
                {(['categories', 'regions', 'tags'] as const).map((key) => (
                  <button key={key} className={`segment ${taxonomyType === key ? 'active' : ''}`} onClick={() => setTaxonomyType(key)}>{key}</button>
                ))}
              </div>
              <div className="mini-list compact-scroll short">
                {taxonomyMap[taxonomyType].map((item) => (
                  <div key={item.id} className="mini-row">
                    <strong>{item.title}</strong>
                    <span>{item.slug}</span>
                  </div>
                ))}
              </div>
              <form className="stack compact-form" onSubmit={handleAddTaxonomy}>
                <label><span>Název</span><input value={taxonomyDraft.title} onChange={(event) => setTaxonomyDraft({ ...taxonomyDraft, title: event.target.value })} /></label>
                <label><span>Slug</span><input value={taxonomyDraft.slug} onChange={(event) => setTaxonomyDraft({ ...taxonomyDraft, slug: event.target.value })} /></label>
                <button className="button secondary" type="submit">Přidat položku</button>
              </form>
            </section>

            <section className="card">
              <div className="panel-head compact">
                <div>
                  <h3>Média</h3>
                  <p className="muted">MVP knihovna assetů přes URL metadata.</p>
                </div>
              </div>
              <div className="mini-list compact-scroll short media-preview-list">
                {media.slice(0, 8).map((item) => (
                  <div key={item.id} className="mini-row">
                    <strong>{item.title}</strong>
                    <span>{item.id}</span>
                  </div>
                ))}
              </div>
              <form className="stack compact-form" onSubmit={handleAddMedia}>
                <label><span>Název</span><input value={mediaDraft.title} onChange={(event) => setMediaDraft({ ...mediaDraft, title: event.target.value })} /></label>
                <label><span>URL</span><input value={mediaDraft.url} onChange={(event) => setMediaDraft({ ...mediaDraft, url: event.target.value })} /></label>
                <label><span>Alt</span><input value={mediaDraft.alt} onChange={(event) => setMediaDraft({ ...mediaDraft, alt: event.target.value })} /></label>
                <button className="button secondary" type="submit">Přidat médium</button>
              </form>
            </section>
            {session.user?.role === 'admin' && (
              <section className="card">
                <div className="panel-head compact">
                  <div>
                    <h3>Team access</h3>
                    <p className="muted">Mapování Discord identity na interní roli.</p>
                  </div>
                </div>
                <div className="mini-list compact-scroll short">
                  {authIdentities.map((item) => (
                    <div key={item.id} className="mini-row">
                      <strong>{item.display_name || item.user_id}</strong>
                      <span>{item.external_id}</span>
                      <small>{item.role_override || item.role || '—'}</small>
                    </div>
                  ))}
                  {!authIdentities.length && <div className="empty-state">Zatím bez explicitních mapování.</div>}
                </div>
                <form className="stack compact-form" onSubmit={handleAddIdentity}>
                  <label><span>Discord external id</span><input value={identityDraft.external_id} onChange={(event) => setIdentityDraft({ ...identityDraft, external_id: event.target.value })} /></label>
                  <label><span>Lokální user</span><select value={identityDraft.user_id} onChange={(event) => setIdentityDraft({ ...identityDraft, user_id: event.target.value })}><option value="">—</option>{users.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
                  <label><span>Role override</span><select value={identityDraft.role_override} onChange={(event) => setIdentityDraft({ ...identityDraft, role_override: event.target.value })}><option value="">bez override</option><option value="admin">admin</option><option value="editor">editor</option><option value="author">author</option></select></label>
                  <button className="button secondary" type="submit">Přidat access mapping</button>
                </form>
              </section>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
