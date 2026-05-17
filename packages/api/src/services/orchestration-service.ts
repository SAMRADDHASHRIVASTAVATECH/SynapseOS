import { orchestrate } from '@atlas/orchestrator';
import type { OrchestrationResult, UserRequest } from '@atlas/core';
import { AtlasRepository, migrate, openDatabase } from '@atlas/storage';
import type { ScoringWeightsConfig } from '@atlas/core';

export class OrchestrationService {
  private readonly repo: AtlasRepository;

  constructor(
    private readonly weights: ScoringWeightsConfig,
    dbPath?: string,
  ) {
    const db = openDatabase(dbPath);
    migrate(db);
    this.repo = new AtlasRepository(db);
  }

  async run(request: UserRequest): Promise<OrchestrationResult> {
    const result = await orchestrate(request, { weights: this.weights });

    this.repo.saveOrchestration({
      id: result.request_id,
      session_id: result.session_id,
      prompt: request.prompt,
      assigned_mode: result.assigned_mode,
      metadata: result.metadata,
      scoring: result.scoring,
      result,
      security_blocked: result.security_blocked,
      total_duration_ms: result.total_duration_ms,
      traces: result.trace,
    });

    return result;
  }

  listHistory(limit = 50) {
    return this.repo.listRequests(limit);
  }

  getById(id: string) {
    const req = this.repo.getRequest(id);
    if (!req) return null;
    const traces = this.repo.getTraces(id);
    return { request: req, traces };
  }
}
