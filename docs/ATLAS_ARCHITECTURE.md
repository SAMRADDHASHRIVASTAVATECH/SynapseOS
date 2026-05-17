# Project Atlas Control — Architecture

## 1) Executive summary

Project Atlas Control is an offline-first, deterministic mode-assignment and workflow-orchestration system. A user request passes through six vertical tiers: input normalization, metadata extraction, weighted mode scoring, workflow dispatch, execution with validation, and observable output. Eight modes (`individual`, `multi_agent`, `research`, `build`, `review`, `debug`, `creative`, `safety`) are registered with full contracts. The MVP ships as a TypeScript monorepo with SQLite persistence, Express API, React dashboard, and mock deterministic workers.

**Goals:** transparent routing (&lt;50ms scoring), expandable registry, validation-before-merge, security gating.

---

## 2) Full system architecture

```
Tier 0  User Input          prompt, files, context, manualOverride
          │
Tier 1  Metadata Analysis   extractMetadata() — hybrid pipeline
          │
Tier 2  Mode Selection      scoreModes() + routeRequest()
          │
Tier 3  Workflow Orchestration   decomposeTasks(), WorkerPool
          │
Tier 4  Execution + Validation  runWorker(), validateWorkerResults()
          │
Tier 5  Output + Observability  synthesizeOutput(), SQLite, API, UI
```

**Packages:**

| Package | Tier focus | Responsibility |
|---------|------------|----------------|
| `@atlas/core` | 1–2 | Types, registry, metadata, scoring, router |
| `@atlas/orchestrator` | 3–4 | Engine, workers, validation, security, synthesis |
| `@atlas/storage` | 5 | SQLite schema, repository |
| `@atlas/api` | 5 | REST lifecycle |
| `@atlas/web` | 5 | Trace dashboard |

**Boundary rules:** Core never imports orchestrator. Security (J) runs inside orchestrator after routing but before workers. Validation (I) runs after workers, before final trace completion.

---

## 3) Mode registry design

Each mode is a `ModeDefinition` with required fields: `mode_id`, `name`, `purpose`, `trigger_conditions`, `exclusion_conditions`, `weight_profile`, `tool_permissions`, `confidence_threshold`, `fallback_mode`, `execution_strategy`, `output_style`, `validation_requirements`.

Source: `packages/core/src/registry/modes.ts`. Loaded at startup; exposed via `GET /api/modes`.

**Expansion:** Add a new object to `MODE_REGISTRY`, extend `ModeId` union, add affinity maps in `scoring/engine.ts`, synthesis template in `synthesis.ts`, and optional validation checks.

---

## 4) Metadata extraction pipeline

**Normalized fields:** `intent`, `domain`, `complexity`, `urgency`, `risk`, `ambiguity`, `output_format`, `required_tools`, `memory_relevance`, `workflow_depth`, `execution_cost`.

**Pipeline stages (deterministic):**

1. **Rule-based:** intent/domain regex tables, risk keyword scan, tool detection.
2. **Heuristic:** complexity from length/structure, workflow depth composite.
3. **Model-assisted (MVP simulated):** coordinate elevation when compound prompts detected.
4. **Hybrid fallback:** `extraction_method` tag + `extraction_trace` array.

Implementation: `packages/core/src/metadata/extractor.ts`.

---

## 5) Mode scoring engine

**Components (weighted):** `intent_match`, `domain_match`, `complexity_match`, `tool_match`, `safety_match`, `workflow_fit`, `output_fit`, `memory_relevance`.

Config: `config/scoring-weights.json`.

**Process:**

1. Score each mode → `ModeScore` with component breakdown.
2. Apply exclusion rules (high risk, trivial complexity, intent conflicts).
3. Sort by total descending; tie-break via `tieBreakOrder`.
4. Fallback if below `minConfidence` or mode `confidence_threshold`.
5. High `metadata.risk` → force `safety` when eligible.

Implementation: `packages/core/src/scoring/engine.ts`. Returns `ScoringResult` with full `trace[]` and `duration_ms`.

---

## 6) Routing and decision logic

`routeRequest(request, weights)`:

1. Extract metadata.
2. If valid `manualOverride`, assign override (scoring still computed for observability).
3. Else `scoreModes()` winner.

Output: `RoutingDecision` with `assigned_mode`, `metadata`, `scoring`, `override_applied`, `trace`.

No hidden branches — every decision step appended to trace strings.

---

## 7) Multi-agent orchestration design

Triggered when `assigned_mode === 'multi_agent'` or `workflow_depth > 0.55`.

**Workers:** `w-alpha` (research hint), `w-beta` (build hint), `w-gamma` (review hint).

**Pool:** `WorkerPool` runs chunks with concurrency limit (default 3).

**Merge:** Validation gate → `synthesizeOutput` concatenates worker sections.

Future: replace `runWorker` with Cursor SDK / HTTP agent endpoints; preserve handoff JSON schema.

---

## 8) Workflow execution engine

`orchestrate()` phases traced: `route` → `score` → `security` → `decompose` → `dispatch` → `execute` → `validate` → `merge` → `synthesize`.

**Strategies (from registry):**

| Mode | Strategy |
|------|----------|
| individual | single_pass (1 worker) |
| multi_agent | parallel_workers |
| research | iterative_research |
| build | build_pipeline |
| review | review_loop |
| debug | debug_trace |
| creative | creative_branch |
| safety | safety_gate |

Implementation: `packages/orchestrator/src/engine.ts`.

---

## 9) State, memory, and session handling

- `sessionId` on request; auto-generated if absent.
- `sessions` table stores `context_json` (optional project context).
- `memory_relevance` metadata boosts research-oriented modes when session present.
- Orchestration results stored per `request_id` with full JSON blob for replay.

---

## 10) Database schema

**Tables:**

- `schema_migrations(version, applied_at)`
- `sessions(id, created_at, updated_at, context_json)`
- `orchestration_requests(id, session_id, prompt, assigned_mode, metadata_json, scoring_json, result_json, security_blocked, total_duration_ms, created_at)`
- `orchestration_traces(id, request_id, phase, message, data_json, timestamp)`

Canonical SQL: `packages/storage/src/schema.ts`. File reference: `data/migrations/001_initial.sql`.

---

## 11) Logging and observability

- **API response:** full `trace`, `scoring.trace`, `metadata.extraction_trace`.
- **Persistence:** per-phase rows in `orchestration_traces`.
- **Dashboard:** scoring table, execution trace list, synthesis panel.
- **History:** `GET /api/history`, `GET /api/history/:id`.

Structured logs to stdout on server start (port, endpoints).

---

## 12) Validation and safety layer

**Validation (I):** `validateWorkerResults` — non-empty synthesis, worker success, mode-specific requirements (`merge_consistency`, `risk_acknowledged`, `alternatives_count`).

**Safety (J):** `scanSecurity` — blocked patterns, escalation blocks, critical metadata risk. Blocked requests skip workers; synthesis returns policy notice.

**Scoring safety:** Modes excluded or boosted based on `metadata.risk`; `safety` mode affinity on security domain.

---

## 13) Frontend architecture

React + Vite (`packages/web`). Proxies `/api` to backend.

**Views:**

- Request composer + manual override select
- Assignment panel (mode badge, confidence, metadata grid)
- Mode scores table (winner highlighted, excluded struck through)
- Scoring + execution trace lists
- Synthesis markdown panel
- Registry count footer

Styling: dark theme, IBM Plex fonts, CSS variables.

---

## 14) Backend architecture

Express app (`packages/api/src/index.ts`):

- Loads weights from repo root `config/scoring-weights.json`
- `OrchestrationService` — orchestrate + persist
- Routes in `routes.ts`
- CLI: `npm run orchestrate -w @atlas/api -- "prompt"`

Process `chdir` to monorepo root for consistent DB/config paths.

---

## 15) API structure

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service index |
| GET | `/api/health` | Health check |
| GET | `/api/modes` | Full mode registry |
| GET | `/api/config/scoring` | Scoring config note |
| POST | `/api/orchestrate` | Run full pipeline |
| GET | `/api/history` | List requests |
| GET | `/api/history/:id` | Request + traces |

**POST /api/orchestrate body:**

```json
{
  "prompt": "string (required)",
  "files": ["optional paths"],
  "projectContext": {},
  "manualOverride": "build",
  "sessionId": "optional"
}
```

Response: `OrchestrationResult` JSON (mode, metadata, scoring, workers, validation, synthesis, traces).

---

## 16) Runtime lifecycle

1. HTTP/CLI receives request
2. Service invokes `orchestrate()`
3. Routing + security scan
4. Worker pool execution (or skip if blocked)
5. Validation + synthesis
6. Persist to SQLite
7. Return JSON to client

**Timeouts:** `withTimeout` wraps pool (default 30s). **Cancellation:** future `AbortSignal` hook at API layer.

---

## 17) Failure handling and recovery

| Failure | Behavior |
|---------|----------|
| Below confidence | Fallback to mode's `fallback_mode` or global `individual` |
| No eligible modes | Global fallback |
| Validation fail | Annotate synthesis; still return 200 with `validation.passed: false` |
| Security block | No workers; policy synthesis |
| Timeout | 500 with error message |
| DB error | 500; in-memory orchestration possible future fallback |

Retry policy (future): idempotent `request_id` from prompt hash.

---

## 18) Performance strategy

- **Routing target:** scoring path uses in-memory regex/heuristics only — typically &lt;5ms on MVP hardware.
- **Workers:** mock delay 5–20ms each; parallel chunking minimizes wall time.
- **SQLite WAL:** concurrent reads during writes.
- **No network in hot path** for routing (offline-first).

Optimize: cache compiled regex, precompute affinity maps, optional WASM scorer.

---

## 19) Folder structure

```
project-atlas-control/
  config/scoring-weights.json
  data/
    atlas.db                 # created on migrate
    migrations/001_initial.sql
  docs/
    ATLAS_ARCHITECTURE.md
    AGENT_HANDOFFS.md
  packages/
    core/src/                # types, registry, metadata, scoring, router
    orchestrator/src/        # engine, workers, validation, security
    storage/src/             # sqlite, repository, migrate
    api/src/                 # express, routes, cli
    web/src/                 # react dashboard
  package.json               # workspaces
  README.md
```

---

## 20) MVP build sequence

1. Initialize monorepo workspaces and `tsconfig.base.json`
2. Implement `@atlas/core` types + registry + metadata + scoring + router
3. Add `config/scoring-weights.json`
4. Implement `@atlas/orchestrator` (security, workers, validation, synthesis, engine)
5. Implement `@atlas/storage` schema + migrate script
6. Implement `@atlas/api` routes + service + CLI
7. Build `@atlas/web` dashboard
8. Run `npm install`, `npm run build`, `npm run migrate`
9. Start API + web; verify `POST /api/orchestrate` traces
10. Document handoffs (`AGENT_HANDOFFS.md`) and architecture (this file)

**Verified example prompts:** see README.md for expected winning modes.
