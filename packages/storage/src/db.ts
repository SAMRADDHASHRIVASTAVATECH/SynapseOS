import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MIGRATION_001 } from './schema.js';

export function resolveDbPath(custom?: string): string {
  if (custom) return resolve(custom);
  return resolve(process.cwd(), 'data', 'atlas.db');
}

export function openDatabase(dbPath?: string): Database.Database {
  const path = resolveDbPath(dbPath);
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function migrate(db: Database.Database): void {
  const tableExists = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`,
    )
    .get();
  let current = 0;
  if (tableExists) {
    const row = db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as {
      v: number | null;
    };
    current = row?.v ?? 0;
  }
  if (current < 1) {
    db.exec(MIGRATION_001);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (1)').run();
  }
}

export interface PersistedRequest {
  id: string;
  session_id: string;
  prompt: string;
  assigned_mode: string;
  metadata_json: string;
  scoring_json: string;
  result_json: string | null;
  security_blocked: number;
  total_duration_ms: number | null;
  created_at: string;
}

export class AtlasRepository {
  constructor(private readonly db: Database.Database) {}

  upsertSession(id: string, context?: Record<string, unknown>): void {
    this.db
      .prepare(
        `INSERT INTO sessions (id, context_json) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = datetime('now'), context_json = excluded.context_json`,
      )
      .run(id, context ? JSON.stringify(context) : null);
  }

  saveOrchestration(data: {
    id: string;
    session_id: string;
    prompt: string;
    assigned_mode: string;
    metadata: unknown;
    scoring: unknown;
    result: unknown;
    security_blocked: boolean;
    total_duration_ms: number;
    traces: Array<{ phase: string; message: string; data?: unknown; timestamp: string }>;
  }): void {
    const insert = this.db.transaction(() => {
      this.upsertSession(data.session_id);
      this.db.prepare(`DELETE FROM orchestration_traces WHERE request_id = ?`).run(data.id);
      this.db
        .prepare(
          `INSERT INTO orchestration_requests
           (id, session_id, prompt, assigned_mode, metadata_json, scoring_json, result_json, security_blocked, total_duration_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             session_id = excluded.session_id,
             prompt = excluded.prompt,
             assigned_mode = excluded.assigned_mode,
             metadata_json = excluded.metadata_json,
             scoring_json = excluded.scoring_json,
             result_json = excluded.result_json,
             security_blocked = excluded.security_blocked,
             total_duration_ms = excluded.total_duration_ms,
             created_at = datetime('now')`,
        )
        .run(
          data.id,
          data.session_id,
          data.prompt,
          data.assigned_mode,
          JSON.stringify(data.metadata),
          JSON.stringify(data.scoring),
          JSON.stringify(data.result),
          data.security_blocked ? 1 : 0,
          data.total_duration_ms,
        );

      const traceStmt = this.db.prepare(
        `INSERT INTO orchestration_traces (request_id, phase, message, data_json, timestamp) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const t of data.traces) {
        traceStmt.run(
          data.id,
          t.phase,
          t.message,
          t.data ? JSON.stringify(t.data) : null,
          t.timestamp,
        );
      }
    });
    insert();
  }

  getRequest(id: string): PersistedRequest | undefined {
    return this.db
      .prepare(`SELECT * FROM orchestration_requests WHERE id = ?`)
      .get(id) as PersistedRequest | undefined;
  }

  listRequests(limit = 50): PersistedRequest[] {
    return this.db
      .prepare(`SELECT * FROM orchestration_requests ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as PersistedRequest[];
  }

  getTraces(requestId: string): Array<{
    phase: string;
    message: string;
    data_json: string | null;
    timestamp: string;
  }> {
    return this.db
      .prepare(
        `SELECT phase, message, data_json, timestamp FROM orchestration_traces WHERE request_id = ? ORDER BY id`,
      )
      .all(requestId) as Array<{
      phase: string;
      message: string;
      data_json: string | null;
      timestamp: string;
    }>;
  }
}
