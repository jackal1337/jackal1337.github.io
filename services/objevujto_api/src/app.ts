import express from 'express';
import path from 'node:path';

import type { Settings } from './config/settings.js';
import { AuthAdapter } from './lib/auth.js';
import { HttpError } from './lib/http.js';
import { Repository } from './repository/repository.js';
import { createAdminRouter } from './routes/admin.js';
import { createPublicRouter } from './routes/public.js';

export function createApp(repository: Repository, settings: Settings) {
  const app = express();
  const auth = new AuthAdapter(settings);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const origin = req.header('Origin');
    if (!origin) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (settings.publicCorsOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    next();
  });

  app.options('*', (_req, res) => {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Objevujto-Dev-User, X-Objevujto-Dev-Role, X-Objevujto-Dev-Email, X-Authenticated-User, X-Authenticated-Role, X-Authenticated-Email, X-Authenticated-Name, X-Auth-User, X-Auth-User-Id, X-Auth-Role');
    res.sendStatus(204);
  });

  const mount = express.Router();
  mount.get('/health', (_req, res) => res.json({ ok: true }));
  mount.use('/api/public', createPublicRouter(repository, settings));
  mount.use('/api/admin', createAdminRouter(repository, auth, settings));

  if (settings.adminBuildDir) {
    const adminIndex = path.resolve(settings.adminBuildDir, 'index.html');
    mount.get('/admin/', (_req, res) => res.sendFile(adminIndex));
    mount.use('/admin/assets', express.static(path.resolve(settings.adminBuildDir, 'assets'), { redirect: false }));
  }

  app.use(mount);
  if (settings.basePath && settings.basePath !== '/') {
    const target = settings.publicBaseUrl.endsWith('/') ? settings.publicBaseUrl : `${settings.publicBaseUrl}/`;
    const escapedBasePath = settings.basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    app.get(new RegExp(`^${escapedBasePath}/admin$`), (_req, res) => res.redirect(301, `${settings.basePath}/admin/`));
    app.get(new RegExp(`^${escapedBasePath}/?$`), (_req, res) => res.redirect(302, target));
    app.use(settings.basePath, mount);
  }

  app.use((req, _res, next) => {
    next(new HttpError(404, `Unknown path: ${req.path}`));
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
