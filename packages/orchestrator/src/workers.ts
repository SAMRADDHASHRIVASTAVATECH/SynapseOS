import { stableHash, type ExtractedMetadata, type ModeId, type WorkerResult } from '@atlas/core';

export interface WorkerTask {
  worker_id: string;
  subtask: string;
  mode_hint: ModeId;
}

/**
 * Decompose prompt into worker tasks.
 * Multi-agent or deep workflows get 3 specialized workers;
 * everything else gets a single primary worker.
 */
export function decomposeTasks(
  prompt: string,
  modeId: ModeId,
  metadata: ExtractedMetadata,
): WorkerTask[] {
  if (modeId === 'multi_agent' || metadata.workflow_depth > 0.55) {
    return [
      { worker_id: 'w-alpha', subtask: `analyze:${prompt.slice(0, 80)}`, mode_hint: 'research' },
      { worker_id: 'w-beta', subtask: `execute:${prompt.slice(0, 80)}`, mode_hint: 'build' },
      { worker_id: 'w-gamma', subtask: `verify:${prompt.slice(0, 80)}`, mode_hint: 'review' },
    ];
  }
  return [{ worker_id: 'w-primary', subtask: prompt, mode_hint: modeId }];
}

/** Deterministic mock worker — hash-based stable outputs */
export async function runWorker(task: WorkerTask, assignedMode: ModeId): Promise<WorkerResult> {
  const start = performance.now();
  await delay(5 + (stableHash(task.worker_id) % 15));

  const h = stableHash(`${task.worker_id}:${task.subtask}`);
  const output = `[${task.worker_id}] Completed subtask for mode=${assignedMode} hint=${task.mode_hint}: ${summarizeSubtask(task.subtask, h)}`;

  return {
    worker_id: task.worker_id,
    mode_id: task.mode_hint,
    status: 'success',
    output,
    artifacts: [`artifact-${task.worker_id}.txt`],
    duration_ms: performance.now() - start,
    retry_count: 0,
  };
}

function summarizeSubtask(subtask: string, hash: number): string {
  const verbs = ['analyzed', 'implemented', 'verified', 'documented'];
  return `${verbs[hash % verbs.length]} — ${subtask.slice(0, 120)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Concurrent worker pool with configurable parallelism.
 * Processes tasks in chunks up to `concurrency` size.
 * Results are sorted by worker_id for deterministic ordering.
 */
export class WorkerPool {
  private readonly concurrency: number;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  async runAll(tasks: WorkerTask[], assignedMode: ModeId): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];
    for (let i = 0; i < tasks.length; i += this.concurrency) {
      const chunk = tasks.slice(i, i + this.concurrency);
      const chunkResults = await Promise.allSettled(
        chunk.map((task) => runWorker(task, assignedMode)),
      );

      for (let j = 0; j < chunkResults.length; j++) {
        const settled = chunkResults[j]!;
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          // Graceful failure — record the worker as failed instead of crashing
          results.push({
            worker_id: chunk[j]!.worker_id,
            mode_id: chunk[j]!.mode_hint,
            status: 'failed',
            output: '',
            artifacts: [],
            duration_ms: 0,
            retry_count: 0,
            error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
          });
        }
      }
    }
    return results.sort((a, b) => a.worker_id.localeCompare(b.worker_id));
  }
}
