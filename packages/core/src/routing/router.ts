import type { RoutingDecision, ScoringWeightsConfig, UserRequest } from '../types.js';
import { extractMetadata } from '../metadata/extractor.js';
import { scoreModes } from '../scoring/engine.js';
import { getModeById } from '../registry/modes.js';

export function routeRequest(
  request: UserRequest,
  weights: ScoringWeightsConfig,
): RoutingDecision {
  const trace: string[] = ['router:start'];
  const metadata = extractMetadata(request);
  trace.push(...metadata.extraction_trace.map((t) => `metadata:${t}`));

  if (request.manualOverride) {
    const mode = getModeById(request.manualOverride);
    if (mode) {
      trace.push(`override:manual→${request.manualOverride}`);
      const scoring = scoreModes(metadata, weights);
      return {
        assigned_mode: request.manualOverride,
        metadata,
        scoring: { ...scoring, winner: request.manualOverride, used_fallback: false },
        override_applied: true,
        trace,
      };
    }
    trace.push(`override:invalid_${request.manualOverride}`);
  }

  const scoring = scoreModes(metadata, weights);
  trace.push(...scoring.trace.map((t) => `scoring:${t}`));

  return {
    assigned_mode: scoring.winner,
    metadata,
    scoring,
    override_applied: false,
    trace,
  };
}
