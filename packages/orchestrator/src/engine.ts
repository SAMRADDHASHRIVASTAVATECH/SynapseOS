import {
  routeRequest,
  getModeById,
  stableId,
  type ExecutionState,
  type OrchestrationResult,
  type OrchestrationTrace,
  type RoutingDecision,
  type ScoringWeightsConfig,
  type StateTransition,
  type UserRequest,
  type WorkerResult,
  VALID_STATE_TRANSITIONS,
} from '@atlas/core';
import { scanSecurity } from './security.js';
import { decomposeTasks, WorkerPool } from './workers.js';
import { validateWorkerResults } from './validation.js';
import { synthesizeOutput } from './synthesis.js';

export interface OrchestrateOptions {
  weights: ScoringWeightsConfig;
  sessionId?: string;
  requestId?: string;
  workerConcurrency?: number;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

/**
 * State machine helper — enforces valid transitions.
 * Rejects invalid state transitions with a descriptive error.
 */
class ExecutionStateMachine {
  private current: ExecutionState = 'queued';
  readonly timeline: StateTransition[] = [];

  transition(to: ExecutionState, reason?: string): void {
    const allowed = VALID_STATE_TRANSITIONS[this.current];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid state transition: ${this.current} → ${to}. ` +
        `Allowed: [${allowed.join(', ')}]`,
      );
    }
    this.timeline.push({
      from: this.current,
      to,
      timestamp: new Date().toISOString(),
      reason,
    });
    this.current = to;
  }

  get state(): ExecutionState {
    return this.current;
  }
}

export async function orchestrate(
  request: UserRequest,
  options: OrchestrateOptions,
): Promise<OrchestrationResult> {
  const start = performance.now();
  const trace: OrchestrationTrace[] = [];
  const sm = new ExecutionStateMachine();
  const maxRetries = options.maxRetries ?? 1;

  const pushTrace = (
    phase: OrchestrationTrace['phase'],
    message: string,
    data?: Record<string, unknown>,
  ) => {
    trace.push({
      phase,
      timestamp: new Date().toISOString(),
      message,
      duration_ms: performance.now() - start,
      data,
    });
  };

  const sessionId = options.sessionId ?? request.sessionId ?? `sess_${Date.now()}`;
  const requestId = options.requestId ?? `req_${stableId(request.prompt)}`;

  // QUEUED → ANALYZING
  sm.transition('analyzing', 'Pipeline started');
  pushTrace('route', 'Starting metadata extraction');

  const routing: RoutingDecision = routeRequest(
    { ...request, sessionId },
    options.weights,
  );

  // ANALYZING → ROUTING
  sm.transition('routing', `Metadata extracted, intent=${routing.metadata.intent}`);
  pushTrace('score', `Assigned mode: ${routing.assigned_mode}`, {
    confidence: routing.scoring.confidence,
    override: routing.override_applied,
  });

  const mode = getModeById(routing.assigned_mode)!;
  const security = scanSecurity(request, routing.metadata);
  pushTrace('security', security.blocked ? 'Blocked' : 'Passed', {
    flags: security.flags,
    risk: security.risk_level,
  });

  // ROUTING → EXECUTING
  sm.transition('executing', security.blocked ? 'Security blocked — skip workers' : 'Dispatching workers');

  let workers: WorkerResult[] = [];
  if (!security.blocked) {
    pushTrace('decompose', `Strategy: ${mode.execution_strategy}`);
    const tasks = decomposeTasks(request.prompt, routing.assigned_mode, routing.metadata);
    pushTrace('dispatch', `Dispatching ${tasks.length} worker(s)`);

    const pool = new WorkerPool(options.workerConcurrency ?? 3);
    const timeout = options.timeoutMs ?? 30_000;

    // Retry loop
    let attempt = 0;
    let lastError: Error | undefined;
    while (attempt < maxRetries) {
      try {
        checkAbort(options.signal);
        workers = await withTimeout(pool.runAll(tasks, routing.assigned_mode), timeout);
        pushTrace('execute', `Completed ${workers.length} workers (attempt ${attempt + 1})`);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempt++;
        if (attempt < maxRetries) {
          sm.transition('retrying', `Worker failure: ${lastError.message}`);
          pushTrace('execute', `Retry ${attempt}/${maxRetries}: ${lastError.message}`);
          sm.transition('executing', 'Retrying workers');
        }
      }
    }

    if (lastError) {
      sm.transition('failed', lastError.message);
      pushTrace('execute', `All ${maxRetries} attempts failed: ${lastError.message}`);
      return buildResult({
        requestId, sessionId, routing, workers, security, sm, trace, start,
        synthesis: `## Execution Failed\n\nAll ${maxRetries} attempts exhausted.\n\nError: ${lastError.message}`,
        validation: { passed: false, checks: [{ name: 'execution', passed: false, message: lastError.message }] },
      });
    }
  }

  // EXECUTING → REVIEWING
  sm.transition('reviewing', 'Validating worker results');
  pushTrace('validate', 'Running validation gates');

  let synthesis = synthesizeOutput(
    routing.assigned_mode,
    request.prompt,
    routing.metadata,
    workers,
    security.blocked,
  );

  const validation = validateWorkerResults(mode, workers, synthesis);

  if (!validation.passed && !security.blocked) {
    pushTrace('merge', 'Validation failed — applying safe synthesis fallback');
    synthesis += '\n\n> Validation note: some checks did not pass; review trace for details.';
  } else {
    pushTrace('merge', 'Validation passed');
  }

  // REVIEWING → SYNTHESIZING → COMPLETED
  sm.transition('synthesizing', 'Building final output');
  pushTrace('synthesize', 'Final output ready');
  sm.transition('completed', `Total duration: ${(performance.now() - start).toFixed(0)}ms`);

  return buildResult({
    requestId, sessionId, routing, workers, security, sm, trace, start,
    synthesis, validation,
  });
}

/* ─── helpers ─── */

interface BuildResultParams {
  requestId: string;
  sessionId: string;
  routing: RoutingDecision;
  workers: WorkerResult[];
  security: { blocked: boolean; reason?: string };
  sm: ExecutionStateMachine;
  trace: OrchestrationTrace[];
  start: number;
  synthesis: string;
  validation: { passed: boolean; checks: Array<{ name: string; passed: boolean; message: string }> };
}

function buildResult(p: BuildResultParams): OrchestrationResult {
  return {
    request_id: p.requestId,
    session_id: p.sessionId,
    assigned_mode: p.routing.assigned_mode,
    execution_state: p.sm.state,
    state_timeline: p.sm.timeline,
    metadata: p.routing.metadata,
    scoring: p.routing.scoring,
    worker_results: p.workers,
    validation: p.validation,
    synthesis: p.synthesis,
    security_blocked: p.security.blocked,
    security_reason: p.security.reason,
    trace: p.trace,
    total_duration_ms: performance.now() - p.start,
  };
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Orchestration cancelled');
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Orchestration timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
