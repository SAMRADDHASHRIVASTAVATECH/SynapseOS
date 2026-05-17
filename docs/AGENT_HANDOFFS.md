# Atlas Control — Inter-Agent Handoff Format (A–J)

Compact handoff blocks for simulated multitask decomposition. Domains do not overlap.

---

## Agent A — Architecture

**Purpose:** Define 6-tier contract, subsystem boundaries, shared types.

**Assumptions:** TypeScript monorepo; offline-first SQLite; deterministic routing.

**Inputs:** Product requirements, mode list (8), scoring component list.

**Outputs:** `packages/core/src/types.ts`, tier contracts, `docs/ATLAS_ARCHITECTURE.md` sections 1–2, 19.

**Constraints:** No runtime logic in A; registry shape is canonical for B–D.

**Implementation notes:** `UserRequest` → `ExtractedMetadata` → `ScoringResult` → `OrchestrationResult` type chain mirrors tiers 0–5.

**Open risks:** Tier leakage if packages import across boundaries incorrectly.

**Dependency handoff:** → B, C, D consume `ModeDefinition`, `ExtractedMetadata`, `ScoringWeightsConfig`.

---

## Agent B — Routing

**Purpose:** Intent parsing, metadata extraction, mode scoring, assignment.

**Assumptions:** Registry from A; weights in `config/scoring-weights.json`.

**Inputs:** `UserRequest`, scoring config.

**Outputs:** `metadata/extractor.ts`, `scoring/engine.ts`, `routing/router.ts`.

**Constraints:** Deterministic; explainable trace; &lt;50ms scoring target.

**Implementation notes:** Hybrid extractor (rule → heuristic → model-assisted keywords); weighted sum with profile boost; tie-break via `tieBreakOrder`.

**Open risks:** Keyword brittleness; production would swap model-assisted tier for real LLM with frozen prompts.

**Dependency handoff:** → F exposes via `routeRequest`; → C uses `assigned_mode`.

---

## Agent C — Workflow

**Purpose:** Execution paths per mode, dispatch, decomposition.

**Assumptions:** `execution_strategy` on each mode; orchestrator owns phases.

**Inputs:** `RoutingDecision`, `ModeDefinition`.

**Outputs:** `packages/orchestrator/src/engine.ts`, decomposition in `workers.ts`.

**Constraints:** Validation before merge; mode-specific worker counts.

**Implementation notes:** `decomposeTasks` emits 1 or 3 workers; strategies map 1:1 to mode registry.

**Open risks:** Mock workers are not real agents; swap `runWorker` for SDK/HTTP dispatch.

**Dependency handoff:** → D for parallel pool; → I for validation gate.

---

## Agent D — Multi-Agent Coordination

**Purpose:** Parallel workers, merge, synthesis.

**Assumptions:** Worker pool concurrency configurable; deterministic mock outputs.

**Inputs:** `WorkerTask[]`, assigned mode.

**Outputs:** `WorkerPool`, `synthesizeOutput`, sorted `WorkerResult[]`.

**Constraints:** Merge only after per-worker success; stable sort by `worker_id`.

**Implementation notes:** Chunked `Promise.all` pool; synthesis templates per `ModeId`.

**Open risks:** Race conditions if real workers mutate shared state — use isolated work dirs.

**Dependency handoff:** → E persists worker payloads inside `result_json`.

---

## Agent E — Storage

**Purpose:** DB schema, sessions, serialization.

**Assumptions:** SQLite WAL; single-file `data/atlas.db`.

**Inputs:** `OrchestrationResult`, traces.

**Outputs:** `packages/storage`, migrations, `AtlasRepository`.

**Constraints:** JSON columns for metadata/scoring/result; foreign keys on traces.

**Implementation notes:** `migrate()` idempotent; `upsertSession` on each orchestration.

**Open risks:** `better-sqlite3` native build on exotic platforms.

**Dependency handoff:** → F `OrchestrationService` calls repository after run.

---

## Agent F — Backend

**Purpose:** API, request lifecycle, services.

**Assumptions:** Express on port 3847; CORS enabled for web dev proxy.

**Inputs:** HTTP JSON body, loaded weights.

**Outputs:** `POST /api/orchestrate`, history endpoints, CLI.

**Constraints:** 400 on missing prompt; 500 with message on failure.

**Implementation notes:** `OrchestrationService` wires orchestrator + storage; `chdir` to repo root for config/DB paths.

**Open risks:** No auth in MVP — add API keys before production.

**Dependency handoff:** → G consumes OpenAPI-shaped JSON responses.

---

## Agent G — Frontend

**Purpose:** Dashboard, trace views, mode display, overrides.

**Assumptions:** Vite proxy `/api` → 3847; React 18.

**Inputs:** Orchestration API response.

**Outputs:** `packages/web` dashboard with scores table and traces.

**Constraints:** Manual override select optional; no hidden client-side routing.

**Implementation notes:** Examples cover research/build/debug/review/creative/safety triggers.

**Open risks:** Random example button breaks determinism demo — acceptable for UX only.

**Dependency handoff:** None downstream; read-only consumer.

---

## Agent H — Runtime

**Purpose:** Async, queues, pools, cancellation, timeouts.

**Assumptions:** Node 18+; single-process MVP.

**Inputs:** Worker tasks, `timeoutMs` option.

**Outputs:** `WorkerPool`, `withTimeout` in engine.

**Constraints:** Default 30s orchestration timeout; worker delay 5–20ms mock.

**Implementation notes:** `Promise.race` for timeout; concurrency default 3.

**Open risks:** No distributed queue — Redis/BullMQ for scale-out.

**Dependency handoff:** → C/D use pool; configurable via API options (future).

---

## Agent I — Validation

**Purpose:** Reject contradictions, verify completeness (last before output).

**Assumptions:** Mode `validation_requirements` drive checks.

**Inputs:** `WorkerResult[]`, synthesis draft, `ModeDefinition`.

**Outputs:** `ValidationResult` with named checks; synthesis annotation on failure.

**Constraints:** Runs after execute, before final synthesize label; does not silently pass failures.

**Implementation notes:** `validateWorkerResults` in `validation.ts`; mode-specific gates.

**Open risks:** Shallow checks in MVP — extend with schema/AST validators per mode.

**Dependency handoff:** → J may force safety if validation conflicts with risk.

---

## Agent J — Security

**Purpose:** Unsafe action detection, fallbacks, escalation blocks.

**Assumptions:** Runs after metadata, before workers; can block execution.

**Inputs:** `UserRequest`, `ExtractedMetadata`.

**Outputs:** `SecurityScanResult`, `security_blocked` on result.

**Constraints:** Escalation patterns hard-block; high metadata risk routes to safety mode in scorer.

**Implementation notes:** `scanSecurity` flag list; blocked requests skip workers.

**Open risks:** Regex bypass — layer policy engine + allowlists for production.

**Dependency handoff:** → Tier 5 observability records flags in trace phase `security`.
