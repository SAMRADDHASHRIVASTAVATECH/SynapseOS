import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScoringWeights } from './config.js';
import { OrchestrationService } from './services/orchestration-service.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(root);

const prompt = process.argv.slice(2).join(' ') || 'Explain how mode scoring works in Atlas';
const service = new OrchestrationService(loadScoringWeights());

const result = await service.run({ prompt });
console.log(JSON.stringify(result, null, 2));
