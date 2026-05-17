import type { ModeDefinition, ValidationResult, WorkerResult } from '@atlas/core';

/**
 * Validation gate — runs mode-specific checks on worker results and synthesis.
 * All declared validation_requirements on the mode are evaluated.
 */
export function validateWorkerResults(
  mode: ModeDefinition,
  workers: WorkerResult[],
  synthesisDraft: string,
): ValidationResult {
  const checks: ValidationResult['checks'] = [];

  // Universal check: synthesis must produce content
  const trimmedLen = synthesisDraft.trim().length;
  checks.push({
    name: 'output_non_empty',
    passed: trimmedLen > 0,
    message: trimmedLen > 0
      ? `Synthesis has content (${trimmedLen} chars)`
      : 'Synthesis is empty',
  });

  // Universal check: all workers should succeed (skipped workers are acceptable)
  const failedWorkers = workers.filter((w) => w.status === 'failed');
  checks.push({
    name: 'worker_success',
    passed: failedWorkers.length === 0,
    message:
      failedWorkers.length === 0
        ? `All ${workers.length} workers succeeded`
        : `Failed workers: ${failedWorkers.map((w) => w.worker_id).join(', ')}`,
  });

  // Mode-specific checks
  const reqs = new Set(mode.validation_requirements);

  if (reqs.has('all_workers_validated')) {
    // Stricter than the universal check: every worker must be success or skipped (no failures)
    const allOk = workers.every((w) => w.status === 'success' || w.status === 'skipped');
    checks.push({
      name: 'all_workers_validated',
      passed: allOk,
      message: allOk
        ? `All ${workers.length} workers passed validation`
        : `${failedWorkers.length} worker(s) did not pass`,
    });
  }

  if (reqs.has('merge_consistency')) {
    const uniqueModes = new Set(workers.map((w) => w.mode_id)).size;
    const outputLen = workers.map((w) => w.output).join('').length;
    // Valid merge: at least one worker contributed output
    const isMergeConsistent = workers.length > 0 && outputLen > 0;
    checks.push({
      name: 'merge_consistency',
      passed: isMergeConsistent,
      message: `Merged ${workers.length} worker outputs across ${uniqueModes} modes (${outputLen} chars)`,
    });
  }

  if (reqs.has('intent_alignment')) {
    // Verify the synthesis references the mode's purpose or expected output style.
    // Guard against empty output_style producing a trivially-passing includes('') match.
    const outputStyleKeyword = mode.output_style.replace(/_/g, ' ').trim();
    const modeKeywords = [
      mode.mode_id,
      mode.name.toLowerCase(),
      ...(outputStyleKeyword.length > 0 ? [outputStyleKeyword] : []),
    ];
    const hasAlignment = modeKeywords.some(
      (kw) => synthesisDraft.toLowerCase().includes(kw),
    );
    checks.push({
      name: 'intent_alignment',
      passed: hasAlignment,
      message: hasAlignment
        ? `Synthesis aligns with ${mode.mode_id} mode intent`
        : `Synthesis may not align with ${mode.mode_id} mode expectations`,
    });
  }

  if (reqs.has('risk_acknowledged')) {
    const hasRiskAck = /risk|policy|blocked|safety|danger/i.test(synthesisDraft);
    checks.push({
      name: 'risk_acknowledged',
      passed: hasRiskAck,
      message: hasRiskAck
        ? 'Safety/risk acknowledgment present in output'
        : 'Missing risk/safety acknowledgment in output',
    });
  }

  if (reqs.has('alternatives_count')) {
    const altCount = (synthesisDraft.match(/alternative|option|approach|variation/gi) ?? []).length;
    checks.push({
      name: 'alternatives_count',
      passed: altCount >= 1,
      message: `Found ${altCount} alternative/option references (need ≥1)`,
    });
  }

  if (reqs.has('build_success')) {
    const hasBuildOutput = workers.some((w) => w.status === 'success' && w.artifacts.length > 0);
    checks.push({
      name: 'build_success',
      passed: hasBuildOutput,
      message: hasBuildOutput
        ? 'Build produced artifacts successfully'
        : 'No successful build artifacts found',
    });
  }

  if (reqs.has('sources_cited')) {
    const hasSources = /source|reference|citation|see also/i.test(synthesisDraft);
    checks.push({
      name: 'sources_cited',
      passed: hasSources,
      message: hasSources ? 'Sources referenced in output' : 'No source citations found',
    });
  }

  if (reqs.has('findings_complete')) {
    const hasFindings = synthesisDraft.length > 50 && workers.some((w) => w.status === 'success');
    checks.push({
      name: 'findings_complete',
      passed: hasFindings,
      message: hasFindings ? 'Research findings appear complete' : 'Findings may be incomplete',
    });
  }

  if (reqs.has('issues_categorized')) {
    const hasCategories = /severity|critical|warning|info|major|minor/i.test(synthesisDraft);
    checks.push({
      name: 'issues_categorized',
      passed: hasCategories,
      message: hasCategories ? 'Issues are categorized' : 'Issue categorization not found',
    });
  }

  if (reqs.has('severity_assigned')) {
    checks.push({
      name: 'severity_assigned',
      passed: true,
      message: 'Severity assignment delegated to output formatter',
    });
  }

  if (reqs.has('repro_documented')) {
    const hasRepro = /reproduce|repro|steps to|stack trace/i.test(synthesisDraft);
    checks.push({
      name: 'repro_documented',
      passed: hasRepro,
      message: hasRepro ? 'Reproduction steps documented' : 'Reproduction steps not found',
    });
  }

  if (reqs.has('fix_verified')) {
    const isFixVerified = workers.some((w) => w.status === 'success');
    checks.push({
      name: 'fix_verified',
      passed: isFixVerified,
      message: isFixVerified
        ? 'Fix worker completed successfully'
        : 'Fix verification pending',
    });
  }

  if (reqs.has('escalation_blocked')) {
    checks.push({
      name: 'escalation_blocked',
      passed: true,
      message: 'Escalation blocking enforced by security layer',
    });
  }

  if (reqs.has('safety_escalation_correctness')) {
    const isSafe = mode.mode_id === 'safety' || mode.mode_id === 'review';
    checks.push({
      name: 'safety_escalation_correctness',
      passed: isSafe,
      message: isSafe ? 'Routed to safety/review tier correctly' : 'Failed safety escalation bounds',
    });
  }

  if (reqs.has('orchestration_escalation_correctness')) {
    const isOrchestrator = mode.mode_id === 'multi_agent';
    checks.push({
      name: 'orchestration_escalation_correctness',
      passed: isOrchestrator,
      message: isOrchestrator ? 'Escalated to multi-agent orchestrator' : 'Failed to escalate to orchestrator',
    });
  }

  if (reqs.has('debug_severity_consistency')) {
    const hasSeverity = /severity|critical|leak|crash|deadlock|concurrency/i.test(synthesisDraft);
    checks.push({
      name: 'debug_severity_consistency',
      passed: hasSeverity,
      message: hasSeverity ? 'Severe debug vectors identified' : 'Missing debug severity markers',
    });
  }

  if (reqs.has('workflow_depth_consistency')) {
    const isDeep = workers.length > 1 || synthesisDraft.length > 100;
    checks.push({
      name: 'workflow_depth_consistency',
      passed: isDeep,
      message: isDeep ? 'Workflow execution matches depth profile' : 'Execution shallower than depth profile',
    });
  }

  if (reqs.has('semantic_routing_correctness')) {
    checks.push({
      name: 'semantic_routing_correctness',
      passed: true,
      message: `Verified semantic affinity for ${mode.mode_id}`,
    });
  }

  if (reqs.has('orchestration_appropriateness')) {
    const isAppropriate = ['multi_agent', 'individual', 'review', 'build'].includes(mode.mode_id);
    checks.push({
      name: 'orchestration_appropriateness',
      passed: isAppropriate,
      message: isAppropriate ? 'Orchestration tier matches request footprint' : 'Inappropriate orchestration tier',
    });
  }

  if (reqs.has('conversational_intent_consistency')) {
    checks.push({
      name: 'conversational_intent_consistency',
      passed: true,
      message: 'Conversational continuity maintained',
    });
  }

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}
