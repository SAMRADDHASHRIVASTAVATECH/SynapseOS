export interface ModeScore {
  mode_id: string;
  total: number;
  confidence: number;
  excluded: boolean;
  exclusion_reason?: string;
  components: Record<string, number>;
}

export interface StateTransition {
  from: string;
  to: string;
  timestamp: string;
  reason?: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface WorkerResult {
  worker_id: string;
  mode_id: string;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  artifacts: string[];
  duration_ms: number;
  retry_count: number;
  error?: string;
}

export interface OrchestrationResponse {
  request_id: string;
  session_id: string;
  assigned_mode: string;
  execution_state: string;
  state_timeline: StateTransition[];
  metadata: Record<string, unknown>;
  scoring: {
    scores: ModeScore[];
    winner: string;
    confidence: number;
    trace: string[];
    duration_ms: number;
    used_fallback: boolean;
    fallback_reason?: string;
    tie_break_applied: boolean;
  };
  worker_results: WorkerResult[];
  validation: {
    passed: boolean;
    checks: ValidationCheck[];
  };
  synthesis: string;
  security_blocked: boolean;
  security_reason?: string;
  trace: Array<{
    phase: string;
    message: string;
    timestamp: string;
    duration_ms?: number;
    data?: unknown;
  }>;
  total_duration_ms: number;
}

export interface HistoryItem {
  id: string;
  session_id: string;
  prompt: string;
  assigned_mode: string;
  security_blocked: number;
  total_duration_ms: number;
  created_at: string;
}

/** Mode color palette for consistent visual identity */
export const MODE_COLORS: Record<string, { bg: string; fg: string; glow: string }> = {
  individual: { bg: 'rgba(99, 179, 237, 0.15)', fg: '#63b3ed', glow: '#63b3ed' },
  multi_agent: { bg: 'rgba(159, 122, 234, 0.15)', fg: '#9f7aea', glow: '#9f7aea' },
  research: { bg: 'rgba(72, 187, 120, 0.15)', fg: '#48bb78', glow: '#48bb78' },
  build: { bg: 'rgba(237, 137, 54, 0.15)', fg: '#ed8936', glow: '#ed8936' },
  review: { bg: 'rgba(236, 201, 75, 0.15)', fg: '#ecc94b', glow: '#ecc94b' },
  debug: { bg: 'rgba(252, 129, 129, 0.15)', fg: '#fc8181', glow: '#fc8181' },
  creative: { bg: 'rgba(246, 135, 179, 0.15)', fg: '#f687b3', glow: '#f687b3' },
  safety: { bg: 'rgba(245, 101, 101, 0.15)', fg: '#f56565', glow: '#f56565' },
};

export const STATE_COLORS: Record<string, string> = {
  queued: '#8b949e',
  analyzing: '#63b3ed',
  routing: '#9f7aea',
  executing: '#ed8936',
  reviewing: '#ecc94b',
  synthesizing: '#48bb78',
  completed: '#3fb950',
  failed: '#f56565',
  retrying: '#ed8936',
};
