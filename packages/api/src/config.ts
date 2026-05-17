import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScoringWeightsConfig } from '@atlas/core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function loadScoringWeights(): ScoringWeightsConfig {
  const path = resolve(root, 'config', 'scoring-weights.json');
  return JSON.parse(readFileSync(path, 'utf-8')) as ScoringWeightsConfig;
}

export const API_PORT = Number(process.env.ATLAS_PORT ?? 3847);
