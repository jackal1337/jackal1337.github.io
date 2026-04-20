import { Router } from 'express';

import type { Settings } from '../config/settings.js';
import { Repository } from '../repository/repository.js';
import { HttpError } from '../lib/http.js';

export function createPublicRouter(repository: Repository, settings: Settings) {
  const router = Router();

  router.get('/site', (_req, res) => {
    res.json(repository.publicSitePayload());
  });

  router.get('/places', (req, res) => {
    const { region, category, tag, q, featured, page = '1', limit = '12' } = req.query;
    res.json(repository.listPlaces({
      region: region as string | undefined,
      category: category as string | undefined,
      tag: tag as string | undefined,
      q: q as string | undefined,
      featured: featured === '1' || featured === 'true',
    }, false, Number(page), Number(limit)));
  });

  router.get('/places/:slug', (req, res) => {
    const payload = repository.publicPlacePayload(req.params.slug, settings.publicBaseUrl);
    if (!payload) throw new HttpError(404, 'Place not found');
    res.json(payload);
  });

  router.get('/categories', (_req, res) => res.json({ items: repository.listTaxonomy('categories') }));
  router.get('/regions', (_req, res) => res.json({ items: repository.listTaxonomy('regions') }));
  router.get('/tags', (_req, res) => res.json({ items: repository.listTaxonomy('tags') }));
  router.get('/collections', (_req, res) => res.json({ items: repository.listCollections() }));

  return router;
}
