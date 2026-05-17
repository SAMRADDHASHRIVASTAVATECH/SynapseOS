import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { migrate, openDatabase } from './db.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(root);

const db = openDatabase();
migrate(db);
console.log(`Migrations applied. Database: ${resolve(root, 'data', 'atlas.db')}`);
db.close();
