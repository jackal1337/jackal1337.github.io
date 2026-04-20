import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { ObjevujToDatabase } from '../src/db/database.js';
import { Repository } from '../src/repository/repository.js';
import type { Settings } from '../src/config/settings.js';

const seedPath = path.resolve('/root/jackal1337.github.io/services/objevujto_backend/data/seed_content.json');

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'objevujto-api-'));
  return {
    host: '127.0.0.1',
    port: 0,
    basePath: '/objevujto',
    dbPath: path.join(tmpDir, 'objevujto.sqlite3'),
    seedPath,
    authMode: 'stub',
    authDefaultRole: 'admin',
    authBaseUrl: 'https://auth.notjackal.eu',
    publicBaseUrl: 'https://jackal1337.github.io/objevujto',
    adminBaseUrl: 'https://notjackal.eu/objevujto/admin',
    publicApiBaseUrl: 'https://notjackal.eu/objevujto/api/public',
    allowSeedOnStartup: true,
    publicCorsOrigins: ['https://jackal1337.github.io'],
    adminBuildDir: '',
    ...overrides,
  };
}

test('public site contract works on root and basePath mounts', async () => {
  const settings = makeSettings();
  const database = new ObjevujToDatabase(settings);
  const app = createApp(new Repository(database), settings);

  const rootResponse = await request(app).get('/api/public/site');
  assert.equal(rootResponse.status, 200);
  assert.equal(rootResponse.body.site.title, 'ObjevujTo');

  const basePathResponse = await request(app).get('/objevujto/api/public/site');
  assert.equal(basePathResponse.status, 200);
  assert.equal(basePathResponse.body.homepage.hero.title.length > 0, true);
  database.close();
});

test('admin session + create place works in stub mode', async () => {
  const settings = makeSettings();
  const database = new ObjevujToDatabase(settings);
  const app = createApp(new Repository(database), settings);

  const sessionResponse = await request(app).get('/objevujto/api/admin/session').set('X-Objevujto-Dev-User', 'local_admin');
  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.authenticated, true);

  const createResponse = await request(app)
    .post('/objevujto/api/admin/places')
    .set('X-Objevujto-Dev-User', 'local_admin')
    .send({
      title: 'Test místo Node',
      category_id: 'cat_towns',
      region_id: 'region_red_county',
      status: 'draft',
    });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.item.slug, 'test-misto-node');
  database.close();
});

test('admin update preserves related place integrity', async () => {
  const settings = makeSettings();
  const database = new ObjevujToDatabase(settings);
  const app = createApp(new Repository(database), settings);

  const updateResponse = await request(app)
    .put('/objevujto/api/admin/places/place_blueberry')
    .set('X-Objevujto-Dev-User', 'local_admin')
    .send({
      title: 'Blueberry',
      category_id: 'cat_towns',
      region_id: 'region_red_county',
      status: 'published',
      related_place_slugs: ['montgomery'],
    });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.item.id, 'place_blueberry');
  database.close();
});

test('forward-auth session maps known Discord identity to local admin user', async () => {
  const settings = makeSettings({ authMode: 'forward_header', authDefaultRole: 'guest' });
  const database = new ObjevujToDatabase(settings);
  const app = createApp(new Repository(database), settings);

  const response = await request(app)
    .get('/objevujto/api/admin/session')
    .set('X-Auth-User-Id', '1071743456050958386')
    .set('X-Auth-User', 'notjackal.');

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'admin');
  assert.equal(response.body.user.mapped_user_id, 'user_admin');
  database.close();
});

test('forward-auth user without mapping is denied admin data routes', async () => {
  const settings = makeSettings({ authMode: 'forward_header', authDefaultRole: 'guest' });
  const database = new ObjevujToDatabase(settings);
  const app = createApp(new Repository(database), settings);

  const response = await request(app)
    .get('/objevujto/api/admin/places')
    .set('X-Auth-User-Id', '000000000000000000')
    .set('X-Auth-User', 'unknown-user');

  assert.equal(response.status, 403);
  database.close();
});
