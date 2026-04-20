import { Router } from 'express';

import type { Settings } from '../config/settings.js';
import { AuthAdapter } from '../lib/auth.js';
import { HttpError } from '../lib/http.js';
import { Repository } from '../repository/repository.js';

export function createAdminRouter(repository: Repository, auth: AuthAdapter, settings: Settings) {
  const router = Router();

  router.get('/session', (req, res) => {
    const rawSession = auth.resolveSession(req);
    const session = rawSession ? repository.mapSession(rawSession) : null;
    res.json({
      authenticated: Boolean(session),
      user: session,
      login_url: auth.loginUrl(settings.adminBaseUrl),
      logout_url: auth.logoutUrl(settings.adminBaseUrl),
      auth_mode: settings.authMode,
    });
  });

  router.use((req, _res, next) => {
    try {
      const session = repository.mapSession(auth.requireSession(req));
      if (session.role === 'guest') {
        throw new HttpError(403, 'Account is authenticated but not assigned to an ObjevujTo role yet');
      }
      (req as any).session = session;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard', (_req, res) => res.json(repository.dashboardSummary()));
  router.get('/places', (_req, res) => res.json({ items: repository.listAdminPlaces() }));
  router.post('/places', (req, res) => {
    const session = (req as any).session;
    auth.requireRole(session, ['admin', 'editor', 'author']);
    res.status(201).json({ item: repository.createPlace(req.body, session.user_id) });
  });
  router.get('/places/:id', (req, res) => {
    const item = repository.getPlaceById(req.params.id);
    if (!item) throw new HttpError(404, 'Place not found');
    res.json({ item });
  });
  router.put('/places/:id', (req, res) => {
    const session = (req as any).session;
    auth.requireRole(session, ['admin', 'editor', 'author']);
    const item = repository.updatePlace(req.params.id, req.body, session.user_id);
    if (!item) throw new HttpError(404, 'Place not found');
    res.json({ item });
  });
  router.post('/places/:id/publish', (req, res) => {
    const session = (req as any).session;
    auth.requireRole(session, ['admin', 'editor']);
    const item = repository.publishPlace(req.params.id, session.user_id);
    if (!item) throw new HttpError(404, 'Place not found');
    res.json({ item });
  });
  router.get('/places/:id/revisions', (req, res) => res.json({ items: repository.placeRevisions(req.params.id) }));

  router.get('/categories', (_req, res) => res.json({ items: repository.listTaxonomy('categories') }));
  router.post('/categories', (req, res) => res.status(201).json({ item: repository.createTaxonomy('categories', req.body) }));
  router.get('/regions', (_req, res) => res.json({ items: repository.listTaxonomy('regions') }));
  router.post('/regions', (req, res) => res.status(201).json({ item: repository.createTaxonomy('regions', req.body) }));
  router.get('/tags', (_req, res) => res.json({ items: repository.listTaxonomy('tags') }));
  router.post('/tags', (req, res) => res.status(201).json({ item: repository.createTaxonomy('tags', req.body) }));
  router.get('/media', (_req, res) => res.json({ items: repository.listMedia() }));
  router.post('/media', (req, res) => res.status(201).json({ item: repository.createMedia(req.body) }));
  router.get('/users', (_req, res) => res.json({ items: repository.listUsers() }));
  router.get('/auth-identities', (_req, res) => res.json({ items: repository.listAuthIdentities() }));
  router.post('/auth-identities', (req, res) => {
    const session = (req as any).session;
    auth.requireRole(session, ['admin']);
    res.status(201).json({ item: repository.upsertAuthIdentity(req.body) });
  });

  return router;
}
