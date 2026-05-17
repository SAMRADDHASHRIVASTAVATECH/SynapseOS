import type {
  ExtractedMetadata,
  ModeDefinition,
  ModeId,
  ModeScore,
  ScoreComponentBreakdown,
  ScoringResult,
  ScoringWeightsConfig,
} from '../types.js';
import { MODE_REGISTRY } from '../registry/modes.js';

/* ═══════════════════════════════════════════════════════════════
   PHASE 5 — ORCHESTRATION-AWARE AFFINITY MAPS
   Now includes creative and coordinate as first-class intents.
   ═══════════════════════════════════════════════════════════════ */

const INTENT_MODE_AFFINITY: Record<string, ModeId[]> = {
  research: ['research', 'multi_agent'],
  build: ['build', 'individual'],
  review: ['review', 'safety'],
  debug: ['debug', 'safety'],
  creative: ['creative', 'research'],
  coordinate: ['multi_agent', 'build'],
  execute: ['build', 'individual'],
  query: ['individual', 'research'],
  general: ['individual', 'research'],
  discussion: ['individual', 'research'],
  brainstorming: ['creative', 'research'],
  refinement: ['review', 'individual'],
  architecture_discussion: ['multi_agent', 'research'],
  planning: ['research', 'multi_agent'],
  educational: ['individual', 'research'],
  conversational_followup: ['review', 'individual'],
  strategic_iteration: ['creative', 'multi_agent'],
  orchestration_refinement: ['review', 'individual'],
  workflow_refinement: ['review', 'individual'],
  system_improvement: ['review', 'build'],
  failure_analysis: ['research', 'debug', 'multi_agent'],
  infrastructure_troubleshooting: ['debug', 'multi_agent'],
  deployment_troubleshooting: ['debug', 'build'],
};

const DOMAIN_MODE_AFFINITY: Record<string, ModeId[]> = {
  security: ['safety', 'review'],
  frontend: ['build', 'creative'],
  backend: ['build', 'debug'],
  infrastructure: ['multi_agent', 'build'],
  observability: ['multi_agent', 'review'],
  deployment: ['build', 'safety'],
  performance: ['debug', 'build'],
  devops: ['build', 'safety'],
  data: ['research', 'build'],
  networking: ['build', 'debug'],
  general: ['individual'],
};

function affinityScore(modeId: ModeId, affinityList: ModeId[] | undefined): number {
  if (!affinityList?.length) return 0.4;
  const idx = affinityList.indexOf(modeId);
  if (idx === -1) return 0.25;
  return 1 - idx * 0.15;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT SCORING FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

function complexityFit(mode: ModeDefinition, complexity: number): number {
  if (mode.mode_id === 'multi_agent') return 0.3 + complexity * 0.7;
  if (mode.mode_id === 'individual') return complexity < 0.4 ? 0.9 - complexity : 0.5 - complexity * 0.4;
  const prefersHigh = ['research', 'build'].includes(mode.mode_id);
  if (prefersHigh) return 0.3 + complexity * 0.5;
  if (mode.mode_id === 'creative') return 0.6;
  return 0.5 + (complexity - 0.5) * 0.3;
}

function toolFit(mode: ModeDefinition, required: string[]): number {
  if (!required.length) return 0.7;
  const allowed = new Set(mode.tool_permissions);
  const matched = required.filter((t) => allowed.has(t)).length;
  return matched / required.length;
}

function safetyFit(mode: ModeDefinition, risk: number): number {
  if (mode.mode_id === 'safety') return 0.5 + risk * 0.5;
  if (risk > 0.7) return mode.mode_id === 'review' ? 0.6 : 0.2;
  return 1 - risk * (mode.mode_id === 'creative' ? 0.8 : 0.4);
}

function workflowFit(mode: ModeDefinition, depth: number): number {
  if (mode.mode_id === 'multi_agent') return 0.2 + depth * 0.8;
  if (mode.mode_id === 'individual') return depth < 0.3 ? 0.9 : 0.7 - depth * 0.6;
  return 0.5 + (depth - 0.5) * 0.4;
}

function outputFit(mode: ModeDefinition, format: string): number {
  const map: Record<string, ModeId[]> = {
    json: ['build', 'research'],
    markdown: ['research', 'review'],
    code: ['build', 'debug'],
    findings: ['review', 'safety'],
    text: ['individual', 'creative'],
  };
  return affinityScore(mode.mode_id, map[format] ?? map.text);
}

/* ═══════════════════════════════════════════════════════════════
   EXCLUSION RULES — with orchestration intelligence
   ═══════════════════════════════════════════════════════════════ */

function isExcluded(mode: ModeDefinition, meta: ExtractedMetadata): { excluded: boolean; reason?: string } {
  if (meta.risk > 0.75 && mode.mode_id === 'creative') {
    return { excluded: true, reason: 'creative excluded at high risk' };
  }
  if (meta.risk > 0.85 && !['safety', 'review', 'debug'].includes(mode.mode_id)) {
    return { excluded: true, reason: 'high risk requires safety-class modes' };
  }
  if (meta.complexity < 0.25 && mode.mode_id === 'multi_agent') {
    return { excluded: true, reason: 'multi_agent excluded for trivial complexity' };
  }
  if (meta.intent === 'review' && mode.mode_id === 'build') {
    return { excluded: true, reason: 'build excluded for review-only intent' };
  }
  // Phase 8: reject individual for platform-scale tasks
  if (meta.complexity > 0.65 && meta.workflow_depth > 0.55 && mode.mode_id === 'individual') {
    return { excluded: true, reason: 'individual excluded for platform-scale orchestration' };
  }
  // Phase 8: reject build for pure ideation
  if (meta.intent === 'creative' && mode.mode_id === 'build') {
    return { excluded: true, reason: 'build excluded for ideation intent' };
  }
  // Phase 8: reject debug for architectural planning
  if (meta.intent === 'coordinate' && mode.mode_id === 'debug') {
    return { excluded: true, reason: 'debug excluded for architecture orchestration' };
  }
  return { excluded: false };
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 5 — ORCHESTRATION-AWARE SCORING
   Semantic boosts, penalties, and escalation logic.
   ═══════════════════════════════════════════════════════════════ */

function scoreMode(
  mode: ModeDefinition,
  meta: ExtractedMetadata,
  weights: ScoringWeightsConfig,
  trace: string[],
): ModeScore {
  const excl = isExcluded(mode, meta);
  const components: ScoreComponentBreakdown = {
    intent_match: affinityScore(mode.mode_id, INTENT_MODE_AFFINITY[meta.intent]),
    domain_match: affinityScore(mode.mode_id, DOMAIN_MODE_AFFINITY[meta.domain]),
    complexity_match: complexityFit(mode, meta.complexity),
    tool_match: toolFit(mode, meta.required_tools),
    safety_match: safetyFit(mode, meta.risk),
    workflow_fit: workflowFit(mode, meta.workflow_depth),
    output_fit: outputFit(mode, meta.output_format),
    memory_relevance: meta.memory_relevance * (mode.mode_id === 'research' ? 1 : 0.6),
  };

  const w = weights.components;
  let total =
    components.intent_match * w.intent_match +
    components.domain_match * w.domain_match +
    components.complexity_match * w.complexity_match +
    components.tool_match * w.tool_match +
    components.safety_match * w.safety_match +
    components.workflow_fit * w.workflow_fit +
    components.output_fit * w.output_fit +
    components.memory_relevance * w.memory_relevance;

  // Mode self-affinity boost from weight_profile
  const profileBoost =
    Object.entries(mode.weight_profile).reduce((acc, [key, val]) => {
      const comp = (components as unknown as Record<string, number>)[key];
      return comp !== undefined ? acc + comp * val * 0.02 : acc;
    }, 0) / 10;
  total = Math.min(1, total + profileBoost);

  if (excl.excluded) total = 0;

  // ── Semantic boosts ──

  // Direct intent → mode alignment boosts
  if (meta.intent === 'build' && mode.mode_id === 'build') total = Math.min(1, total + 0.14);
  if (meta.intent === 'review' && mode.mode_id === 'review') total = Math.min(1, total + 0.12);
  if (meta.intent === 'debug' && mode.mode_id === 'debug') total = Math.min(1, total + 0.14);

  // CREATIVE: strong boost when creative intent detected
  if (meta.intent === 'creative' && mode.mode_id === 'creative') {
    const boost = 0.20;
    total = Math.min(1, total + boost);
    trace.push(`boost:creative+${boost.toFixed(2)}(creative_intent_detected)`);
  }

  // COORDINATE → MULTI_AGENT: orchestration escalation
  if (meta.intent === 'coordinate' && mode.mode_id === 'multi_agent') {
    const boost = 0.22;
    total = Math.min(1, total + boost);
    trace.push(`boost:multi_agent+${boost.toFixed(2)}(orchestration_escalation:coordinate_intent)`);
  }

  // High complexity + high workflow → multi_agent escalation
  if (meta.complexity > 0.55 && meta.workflow_depth > 0.5 && mode.mode_id === 'multi_agent' && !excl.excluded) {
    const escalation = (meta.complexity + meta.workflow_depth) * 0.08;
    total = Math.min(1, total + escalation);
    trace.push(`boost:multi_agent+${escalation.toFixed(3)}(orchestration_scale:complexity=${meta.complexity.toFixed(2)},depth=${meta.workflow_depth.toFixed(2)})`);
  }

  // ── Conversational Continuity Weighting ──
  const conversationalIntents = ['conversational_followup', 'refinement', 'orchestration_refinement', 'workflow_refinement', 'system_improvement', 'discussion'];
  if (conversationalIntents.includes(meta.intent)) {
    if (mode.mode_id === 'review' || mode.mode_id === 'individual') {
      const boost = 0.18;
      total = Math.min(1, total + boost);
      trace.push(`boost:${mode.mode_id}+${boost.toFixed(2)}(conversational_continuity:${meta.intent})`);
    }
  }

  // ── Multi-Intent Boosts ──
  if (meta.intents && meta.intents.length > 1) {
    for (const subIntent of meta.intents.slice(0, 3)) {
      if (INTENT_MODE_AFFINITY[subIntent]?.includes(mode.mode_id) && subIntent !== meta.intent) {
        total = Math.min(1, total + 0.05);
        trace.push(`boost:${mode.mode_id}+0.05(multi_intent:${subIntent})`);
      }
    }
    
    // Orchestration escalation for debugging workflows
    if (meta.intents.includes('debug') && meta.intents.includes('coordinate') && mode.mode_id === 'multi_agent') {
      total = Math.min(1, total + 0.15);
      trace.push(`boost:multi_agent+0.15(multi_intent_escalation:coordinate+debug)`);
    }
    if (meta.intents.includes('debug') && meta.intents.includes('review') && mode.mode_id === 'review') {
      total = Math.min(1, total + 0.10);
      trace.push(`boost:review+0.10(multi_intent:review+debug)`);
    }
  }

  // ── Semantic penalties ──

  // Individual penalty on high complexity/depth
  if (mode.mode_id === 'individual' && meta.complexity > 0.5 && !excl.excluded) {
    const penalty = meta.complexity * 0.12;
    total = Math.max(0, total - penalty);
    trace.push(`penalty:individual-${penalty.toFixed(3)}(task_too_complex:complexity=${meta.complexity.toFixed(2)})`);
  }

  if (mode.mode_id === 'individual' && meta.workflow_depth > 0.45 && !excl.excluded) {
    const penalty = meta.workflow_depth * 0.10;
    total = Math.max(0, total - penalty);
    trace.push(`penalty:individual-${penalty.toFixed(3)}(workflow_too_deep:depth=${meta.workflow_depth.toFixed(2)})`);
  }

  return {
    mode_id: mode.mode_id,
    total,
    confidence: total,
    components,
    excluded: excl.excluded,
    exclusion_reason: excl.reason,
  };
}

/* ═══════════════════════════════════════════════════════════════
   WINNER SELECTION — with confidence normalization
   ═══════════════════════════════════════════════════════════════ */

function pickWinner(
  scores: ModeScore[],
  meta: ExtractedMetadata,
  weights: ScoringWeightsConfig,
  trace: string[],
): { winner: ModeId; confidence: number; tieBreak: boolean; usedFallback: boolean; fallbackReason?: string } {
  const eligible = scores.filter((s) => !s.excluded && s.total > 0);
  if (!eligible.length) {
    trace.push(`fallback:no_eligible→${weights.globalFallbackMode}`);
    return {
      winner: weights.globalFallbackMode,
      confidence: weights.minConfidence,
      tieBreak: false,
      usedFallback: true,
      fallbackReason: 'no eligible modes',
    };
  }

  const maxTotal = Math.max(...eligible.map((s) => s.total));
  const top = eligible.filter((s) => Math.abs(s.total - maxTotal) < 0.001);
  top.sort((a, b) => weights.tieBreakOrder.indexOf(a.mode_id) - weights.tieBreakOrder.indexOf(b.mode_id));

  let winner = top[0]!;
  const tieBreak = top.length > 1;
  if (tieBreak) trace.push(`tie_break:${top.map((t) => t.mode_id).join(',')}→${winner.mode_id}`);

  const modeDef = MODE_REGISTRY.find((m) => m.mode_id === winner.mode_id)!;
  let usedFallback = false;
  let fallbackReason: string | undefined;

  if (winner.confidence < weights.minConfidence || winner.confidence < modeDef.confidence_threshold) {
    const fb = modeDef.fallback_mode;
    trace.push(`fallback:below_threshold(${winner.confidence.toFixed(3)})→${fb}`);
    winner = scores.find((s) => s.mode_id === fb && !s.excluded) ?? scores.find((s) => s.mode_id === fb)!;
    usedFallback = true;
    fallbackReason = 'below confidence threshold';
  }

  if (meta.risk > 0.75 && winner.mode_id !== 'safety') {
    const safety = scores.find((s) => s.mode_id === 'safety');
    if (safety && !safety.excluded) {
      trace.push('fallback:high_risk→safety');
      winner = safety;
      usedFallback = true;
      fallbackReason = 'high risk override';
    }
  }

  return {
    winner: winner.mode_id,
    confidence: winner.total,
    tieBreak,
    usedFallback,
    fallbackReason,
  };
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════ */

export function scoreModes(
  meta: ExtractedMetadata,
  weights: ScoringWeightsConfig,
): ScoringResult {
  const start = performance.now();
  const trace: string[] = ['scoring:start'];

  // 1) IMMEDIATE SAFETY ESCALATION
  // Bypass normal scoring entirely if critical risk is detected
  if (meta.risk > 0.85) {
    trace.push(`escalation:safety_critical(risk=${meta.risk.toFixed(2)})`);
    const safetyDef = MODE_REGISTRY.find(m => m.mode_id === 'safety')!;
    const score = scoreMode(safetyDef, meta, weights, trace);
    
    // Force score to be 1.0 confidence as it is an immediate escalation
    score.total = 1.0;
    score.confidence = 1.0;
    
    return {
      scores: [score],
      winner: 'safety',
      confidence: 1.0,
      used_fallback: true,
      fallback_reason: 'immediate safety escalation',
      tie_break_applied: false,
      trace,
      duration_ms: performance.now() - start,
    };
  }

  const scores = MODE_REGISTRY.map((mode) => scoreMode(mode, meta, weights, trace)).sort(
    (a, b) => b.total - a.total || a.mode_id.localeCompare(b.mode_id),
  );

  for (const s of scores) {
    trace.push(
      `score:${s.mode_id}=${s.total.toFixed(4)}${s.excluded ? `(excluded:${s.exclusion_reason})` : ''}`,
    );
  }

  const pick = pickWinner(scores, meta, weights, trace);
  trace.push(`winner:${pick.winner} confidence=${pick.confidence.toFixed(4)}`);

  return {
    scores,
    winner: pick.winner,
    confidence: pick.confidence,
    used_fallback: pick.usedFallback,
    fallback_reason: pick.fallbackReason,
    tie_break_applied: pick.tieBreak,
    trace,
    duration_ms: performance.now() - start,
  };
}
