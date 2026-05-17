/** Tier 0 — User Input */
export interface UserRequest {
  prompt: string;
  files?: string[];
  projectContext?: Record<string, unknown>;
  manualOverride?: ModeId;
  sessionId?: string;
}

/** Tier 1 — Normalized metadata */
export interface ExtractedMetadata {
  intent: string;
  intents: string[];
  domain: string;
  complexity: number;
  urgency: number;
  risk: number;
  ambiguity: number;
  output_format: string;
  required_tools: string[];
  memory_relevance: number;
  workflow_depth: number;
  execution_cost: number;
  extraction_method: 'rule' | 'heuristic' | 'model_assisted' | 'hybrid';
  extraction_trace: string[];
}

export type ModeId =
  | 'individual'
  | 'multi_agent'
  | 'research'
  | 'build'
  | 'review'
  | 'debug'
  | 'creative'
  | 'safety';

export type ExecutionStrategy =
  | 'single_pass'
  | 'parallel_workers'
  | 'iterative_research'
  | 'build_pipeline'
  | 'review_loop'
  | 'debug_trace'
  | 'creative_branch'
  | 'safety_gate';

/** Execution state machine — deterministic lifecycle */
export type ExecutionState =
  | 'queued'
  | 'analyzing'
  | 'routing'
  | 'executing'
  | 'reviewing'
  | 'synthesizing'
  | 'completed'
  | 'failed'
  | 'retrying';

/** Ordered valid transitions for state machine enforcement */
export const VALID_STATE_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  queued: ['analyzing', 'failed'],
  analyzing: ['routing', 'failed'],
  routing: ['executing', 'failed'],
  executing: ['reviewing', 'retrying', 'failed'],
  reviewing: ['synthesizing', 'retrying', 'failed'],
  synthesizing: ['completed', 'failed'],
  completed: [],
  failed: ['retrying'],
  retrying: ['analyzing', 'executing', 'failed'],
};

export interface ModeDefinition {
  mode_id: ModeId;
  name: string;
  purpose: string;
  trigger_conditions: string[];
  exclusion_conditions: string[];
  weight_profile: Record<string, number>;
  tool_permissions: string[];
  confidence_threshold: number;
  fallback_mode: ModeId;
  execution_strategy: ExecutionStrategy;
  output_style: string;
  validation_requirements: string[];
}

export interface ScoreComponentBreakdown {
  intent_match: number;
  domain_match: number;
  complexity_match: number;
  tool_match: number;
  safety_match: number;
  workflow_fit: number;
  output_fit: number;
  memory_relevance: number;
}

export interface ModeScore {
  mode_id: ModeId;
  total: number;
  confidence: number;
  components: ScoreComponentBreakdown;
  excluded: boolean;
  exclusion_reason?: string;
}

export interface ScoringResult {
  scores: ModeScore[];
  winner: ModeId;
  confidence: number;
  used_fallback: boolean;
  fallback_reason?: string;
  tie_break_applied: boolean;
  trace: string[];
  duration_ms: number;
}

export interface RoutingDecision {
  assigned_mode: ModeId;
  metadata: ExtractedMetadata;
  scoring: ScoringResult;
  override_applied: boolean;
  trace: string[];
}

export type WorkflowPhase =
  | 'decompose'
  | 'dispatch'
  | 'execute'
  | 'validate'
  | 'merge'
  | 'synthesize';

export interface WorkerResult {
  worker_id: string;
  mode_id: ModeId;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  artifacts: string[];
  duration_ms: number;
  retry_count: number;
  error?: string;
}

export interface ValidationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export interface OrchestrationTrace {
  phase: WorkflowPhase | 'route' | 'score' | 'security';
  timestamp: string;
  message: string;
  duration_ms?: number;
  data?: Record<string, unknown>;
}

/** State transition event in the execution timeline */
export interface StateTransition {
  from: ExecutionState;
  to: ExecutionState;
  timestamp: string;
  reason?: string;
}

export interface OrchestrationResult {
  request_id: string;
  session_id: string;
  assigned_mode: ModeId;
  execution_state: ExecutionState;
  state_timeline: StateTransition[];
  metadata: ExtractedMetadata;
  scoring: ScoringResult;
  worker_results: WorkerResult[];
  validation: ValidationResult;
  synthesis: string;
  security_blocked: boolean;
  security_reason?: string;
  trace: OrchestrationTrace[];
  total_duration_ms: number;
}

export interface ScoringWeightsConfig {
  components: ScoreComponentBreakdown;
  tieBreakOrder: ModeId[];
  minConfidence: number;
  globalFallbackMode: ModeId;
}

/**
 * Deterministic hash — shared utility to eliminate duplication.
 * FNV-1a–style hash for stable, reproducible IDs.
 */
export function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

/** Hex ID from hash — used for request IDs */
export function stableId(input: string): string {
  return stableHash(input).toString(16).padStart(8, '0');
}

/** Clamp to [0, 1] — shared numerical utility */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
