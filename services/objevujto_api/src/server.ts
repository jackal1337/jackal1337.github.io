import { getSettings } from './config/settings.js';
import { ObjevujToDatabase } from './db/database.js';
import { Repository } from './repository/repository.js';
import { createApp } from './app.js';

const settings = getSettings();
const database = new ObjevujToDatabase(settings);
const repository = new Repository(database);
const app = createApp(repository, settings);

app.listen(settings.port, settings.host, () => {
  console.log(`ObjevujTo API listening on http://${settings.host}:${settings.port}`);
});
