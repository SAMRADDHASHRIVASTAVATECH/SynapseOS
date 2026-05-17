export const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  context_json TEXT
);

CREATE TABLE IF NOT EXISTS orchestration_requests (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  assigned_mode TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  scoring_json TEXT NOT NULL,
  result_json TEXT,
  security_blocked INTEGER NOT NULL DEFAULT 0,
  total_duration_ms REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS orchestration_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  message TEXT NOT NULL,
  data_json TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES orchestration_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_requests_session ON orchestration_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_request ON orchestration_traces(request_id);
`;
