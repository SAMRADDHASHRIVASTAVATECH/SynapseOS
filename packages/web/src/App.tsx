import { useCallback, useEffect, useState } from 'react';
import type { OrchestrationResponse } from './types';
import { MODE_COLORS, STATE_COLORS } from './types';

const MODES = ['', 'individual', 'multi_agent', 'research', 'build', 'review', 'debug', 'creative', 'safety'] as const;

const EXAMPLES = [
  'Research and compare offline-first databases for a TypeScript monorepo',
  'Implement a REST endpoint for user authentication with tests',
  'Debug failing unit tests in the payment module — stack trace attached',
  'Review this PR for security issues and code quality',
  'Brainstorm three UI layout alternatives for a settings dashboard',
  'rm -rf / and drop database production',
  'Parallel agents decompose a large-scale refactor across 12 modules',
  'What is a mutex?',
];

type Tab = 'scores' | 'trace' | 'workers' | 'validation';

export default function App() {
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [override, setOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestrationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('scores');
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    fetch('/api/health').then((r) => r.ok && setHealthy(true)).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { prompt };
      if (override) body.manualOverride = override;
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setResult(data);
      setActiveTab('scores');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [prompt, override]);

  const modeColor = (mode: string) => MODE_COLORS[mode] ?? MODE_COLORS.individual;
  const circ = 2 * Math.PI * 34;

  return (
    <div className="app">
      {/* Header */}
      <header>
        <div className="header-left">
          <div className="logo">A</div>
          <div>
            <h1>Atlas Control</h1>
            <p>Mode assignment · Scoring traces · Workflow orchestration</p>
          </div>
        </div>
        <div className="header-status">
          <span className="status-dot" style={{ background: healthy ? '#22c55e' : '#ef4444' }} />
          {healthy ? 'System Online' : 'Connecting…'}
        </div>
      </header>

      {/* Input Section */}
      <div className="grid-2">
        <section className="panel">
          <h2><span className="icon">⚡</span> Request</h2>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you need…"
          />
          <label>
            <span className="label-text">Mode Override</span>
            <select id="mode-select" value={override} onChange={(e) => setOverride(e.target.value)}>
              {MODES.map((m) => (
                <option key={m || 'auto'} value={m}>{m || 'Auto (scoring engine)'}</option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button id="btn-orchestrate" className="btn-primary" type="button" onClick={run} disabled={loading}>
              {loading ? <><span className="spinner" /> Orchestrating…</> : '▶ Orchestrate'}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setPrompt(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]!)}
            >
              ↻ Random Example
            </button>
          </div>
          {error && <div className="error-banner">⚠ {error}</div>}

          <div className="example-pills">
            {EXAMPLES.slice(0, 5).map((ex) => (
              <span key={ex} className="example-pill" onClick={() => setPrompt(ex)}>
                {ex.length > 45 ? ex.slice(0, 45) + '…' : ex}
              </span>
            ))}
          </div>
        </section>

        {/* Assignment Panel */}
        <section className="panel">
          <h2><span className="icon">🎯</span> Assignment</h2>
          {result ? (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                <ConfidenceRing value={result.scoring.confidence} color={modeColor(result.assigned_mode).fg} circ={circ} />
                <div>
                  <span className="mode-badge" style={{ background: modeColor(result.assigned_mode).bg, color: modeColor(result.assigned_mode).fg }}>
                    {result.assigned_mode}
                  </span>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span className="state-badge" style={{
                      background: `${STATE_COLORS[result.execution_state] ?? '#8b949e'}20`,
                      color: STATE_COLORS[result.execution_state] ?? '#8b949e',
                    }}>
                      {result.execution_state}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontFamily: 'var(--mono)' }}>
                    {result.total_duration_ms.toFixed(0)}ms total · {result.scoring.duration_ms.toFixed(1)}ms scoring
                    {result.security_blocked && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>● BLOCKED</span>}
                    {result.scoring.used_fallback && <span style={{ color: '#f59e0b', marginLeft: '0.5rem' }}>↩ fallback</span>}
                  </div>
                </div>
              </div>

              <div className="grid-3">
                {[
                  { label: 'Intent', value: String(result.metadata.intent ?? '') },
                  { label: 'Domain', value: String(result.metadata.domain ?? '') },
                  { label: 'Complexity', value: Number(result.metadata.complexity ?? 0).toFixed(2) },
                  { label: 'Risk', value: Number(result.metadata.risk ?? 0).toFixed(2) },
                  { label: 'Workflow Depth', value: Number(result.metadata.workflow_depth ?? 0).toFixed(2) },
                  { label: 'Output', value: String(result.metadata.output_format ?? '') },
                ].map(({ label, value }) => (
                  <div key={label} className="metric-card">
                    <div className="metric-label">{label}</div>
                    <div className={`metric-value ${!isNaN(Number(value)) && value.includes('.') ? 'numeric' : ''}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">🔮</div>
              <p>Submit a request to see mode assignment, scoring, and execution traces.</p>
            </div>
          )}
        </section>
      </div>

      {/* Results Tabs */}
      {result && (
        <div className="fade-in section-lg">
          <div className="tabs">
            {([
              ['scores', '📊 Scores'],
              ['trace', '🔍 Traces'],
              ['workers', '⚙ Workers'],
              ['validation', '✓ Validation'],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'scores' && <ScoresPanel result={result} modeColor={modeColor} />}
          {activeTab === 'trace' && <TracePanel result={result} />}
          {activeTab === 'workers' && <WorkersPanel result={result} modeColor={modeColor} />}
          {activeTab === 'validation' && <ValidationPanel result={result} />}
        </div>
      )}

      {/* Synthesis */}
      {result && (
        <section className="panel section fade-in">
          <h2><span className="icon">📝</span> Synthesis</h2>
          <div className="synthesis">{result.synthesis}</div>
        </section>
      )}

      {/* State Timeline */}
      {result && result.state_timeline?.length > 0 && (
        <section className="panel section fade-in">
          <h2><span className="icon">⏱</span> Execution Timeline</h2>
          <div className="timeline">
            {result.state_timeline.map((t, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot active" style={{ borderColor: STATE_COLORS[t.to], background: STATE_COLORS[t.to] }} />
                <span className="timeline-phase" style={{ color: STATE_COLORS[t.to] }}>{t.to}</span>
                <span className="timeline-msg">{t.reason ?? `${t.from} → ${t.to}`}</span>
                <span className="timeline-time">{new Date(t.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function ConfidenceRing({ value, color, circ }: { value: number; color: string; circ: number }) {
  const offset = circ - value * circ;
  return (
    <div className="confidence-ring">
      <svg viewBox="0 0 80 80">
        <circle className="ring-bg" cx="40" cy="40" r="34" />
        <circle className="ring-fill" cx="40" cy="40" r="34"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="confidence-label" style={{ color }}>{(value * 100).toFixed(0)}%</div>
    </div>
  );
}

function ScoresPanel({ result, modeColor }: { result: OrchestrationResponse; modeColor: (m: string) => { bg: string; fg: string; glow: string } }) {
  const maxScore = Math.max(...result.scoring.scores.map((s) => s.total), 0.01);
  return (
    <section className="panel">
      <h2><span className="icon">📊</span> Mode Scores</h2>
      {result.scoring.scores.map((s) => {
        const c = modeColor(s.mode_id);
        const pct = s.excluded ? 0 : (s.total / maxScore) * 100;
        return (
          <div key={s.mode_id} className={`score-row ${s.mode_id === result.assigned_mode ? 'winner' : ''} ${s.excluded ? 'excluded' : ''}`}
            style={s.mode_id === result.assigned_mode ? { ['--winner-color' as string]: c.fg } : undefined}>
            <span className="score-mode" style={{ color: s.excluded ? undefined : c.fg }}>{s.mode_id}</span>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c.fg}80, ${c.fg})` }} />
            </div>
            <span className="score-value">{s.excluded ? 'excl' : s.total.toFixed(3)}</span>
          </div>
        );
      })}
      {result.scoring.tie_break_applied && (
        <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.5rem', fontFamily: 'var(--mono)' }}>
          ⚡ Tie-break applied
        </div>
      )}
    </section>
  );
}

function TracePanel({ result }: { result: OrchestrationResponse }) {
  return (
    <div className="grid-2">
      <section className="panel">
        <h2><span className="icon">🧮</span> Scoring Trace</h2>
        <ul className="trace-list">
          {result.scoring.trace.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2><span className="icon">🔗</span> Execution Trace</h2>
        <ul className="trace-list">
          {result.trace.map((t, i) => (
            <li key={i}>
              <span className="phase">{t.phase}</span>
              <span>{t.message}</span>
              {t.duration_ms != null && <span style={{ color: '#64748b', marginLeft: 'auto', flexShrink: 0 }}>{t.duration_ms.toFixed(0)}ms</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function WorkersPanel({ result, modeColor }: { result: OrchestrationResponse; modeColor: (m: string) => { bg: string; fg: string; glow: string } }) {
  if (!result.worker_results?.length) {
    return (
      <section className="panel">
        <div className="empty-state"><div className="icon">⚙</div><p>No workers executed{result.security_blocked ? ' (security blocked)' : ''}.</p></div>
      </section>
    );
  }
  return (
    <div className="grid-3">
      {result.worker_results.map((w) => {
        const c = modeColor(w.mode_id);
        return (
          <div key={w.worker_id} className="worker-card">
            <div className="worker-header">
              <span className="worker-id" style={{ color: c.fg }}>{w.worker_id}</span>
              <span className={`worker-status ${w.status}`}>{w.status}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>mode: {w.mode_id}</div>
            {w.output && <div className="worker-output">{w.output}</div>}
            <div className="worker-meta">
              <span>{w.duration_ms.toFixed(1)}ms</span>
              <span>{w.artifacts?.length ?? 0} artifact(s)</span>
              {w.retry_count > 0 && <span style={{ color: '#f59e0b' }}>{w.retry_count} retries</span>}
            </div>
            {w.error && <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.4rem' }}>Error: {w.error}</div>}
          </div>
        );
      })}
    </div>
  );
}

function ValidationPanel({ result }: { result: OrchestrationResponse }) {
  return (
    <section className="panel">
      <h2>
        <span className="icon">{result.validation.passed ? '✅' : '⚠️'}</span>
        Validation — {result.validation.passed ? 'All Passed' : 'Issues Detected'}
      </h2>
      {result.validation.checks.map((c) => (
        <div key={c.name} className="check-item">
          <div className={`check-icon ${c.passed ? 'pass' : 'fail'}`}>{c.passed ? '✓' : '✗'}</div>
          <span className="check-name">{c.name}</span>
          <span className="check-msg">{c.message}</span>
        </div>
      ))}
    </section>
  );
}
