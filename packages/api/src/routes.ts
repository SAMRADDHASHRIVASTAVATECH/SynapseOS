import { Router } from 'express';
import { MODE_REGISTRY } from '@atlas/core';
import type { OrchestrationService } from './services/orchestration-service.js';
import { loadScoringWeights } from './config.js';

export function createRoutes(service: OrchestrationService): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'atlas-control',
      version: '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/modes', (_req, res) => {
    res.json({
      count: MODE_REGISTRY.length,
      modes: MODE_REGISTRY,
    });
  });

  router.get('/config/scoring', (_req, res) => {
    try {
      const weights = loadScoringWeights();
      res.json({
        status: 'loaded',
        source: 'config/scoring-weights.json',
        weights,
      });
    } catch {
      res.status(500).json({ error: 'Failed to load scoring weights' });
    }
  });

  router.post('/orchestrate', async (req, res) => {
    const requestStart = performance.now();
    try {
      const { prompt, files, projectContext, manualOverride, sessionId } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          error: 'prompt (string) is required',
          received_type: typeof prompt,
        });
        return;
      }
      if (prompt.trim().length === 0) {
        res.status(400).json({ error: 'prompt cannot be empty' });
        return;
      }
      if (prompt.length > 50_000) {
        res.status(400).json({ error: 'prompt exceeds maximum length (50000 chars)' });
        return;
      }
      const result = await service.run({
        prompt,
        files,
        projectContext,
        manualOverride,
        sessionId,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const api_duration_ms = performance.now() - requestStart;
      console.error(`[atlas] POST /api/orchestrate failed (${api_duration_ms.toFixed(0)}ms):`, message);
      res.status(500).json({
        error: message,
        api_duration_ms: Math.round(api_duration_ms),
      });
    }
  });

  router.get('/history', (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit ?? 50)), 500);
    const items = service.listHistory(limit);
    res.json({
      count: items.length,
      limit,
      items,
    });
  });

  router.get('/history/:id', (req, res) => {
    const item = service.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'not found', id: req.params.id });
      return;
    }
    res.json(item);
  });

  return router;
}
