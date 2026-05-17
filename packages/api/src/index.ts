import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScoringWeights, API_PORT } from './config.js';
import { OrchestrationService } from './services/orchestration-service.js';
import { createRoutes } from './routes.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(root);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const weights = loadScoringWeights();
const service = new OrchestrationService(weights);
app.use('/api', createRoutes(service));

app.get('/api', (_req, res) => {
  res.json({
    name: 'Project Atlas Control',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: 'GET /api/health',
      modes: 'GET /api/modes',
      scoring: 'GET /api/config/scoring',
      orchestrate: 'POST /api/orchestrate',
      history: 'GET /api/history',
      history_detail: 'GET /api/history/:id',
    },
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(root, 'packages/web/dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(resolve(root, 'packages/web/dist/index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ status: 'Dev mode - web is running on Vite dev server (port 5173)' });
  });
}

app.listen(API_PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     Project Atlas Control API        ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  → API:          http://localhost:${API_PORT}`);
  console.log(`  → Orchestrate:  POST http://localhost:${API_PORT}/api/orchestrate`);
  console.log(`  → Health:       GET  http://localhost:${API_PORT}/api/health`);
  console.log(`  → Modes:        GET  http://localhost:${API_PORT}/api/modes`);
  console.log(`  → History:      GET  http://localhost:${API_PORT}/api/history`);
  console.log('');
  console.log(`  Scoring weights loaded from config/scoring-weights.json`);
  console.log(`  Database:       data/atlas.db (WAL mode)`);
  console.log('');
});
