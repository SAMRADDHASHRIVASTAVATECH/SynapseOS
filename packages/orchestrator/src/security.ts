import type { ExtractedMetadata, UserRequest } from '@atlas/core';

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /drop\s+database/i,
  /exfiltrate/i,
  /disable\s+all\s+security/i,
  /ignore\s+safety/i,
];

const ESCALATION_BLOCK = [/sudo\s+rm/i, /format\s+c:/i, /delete\s+production/i];

export interface SecurityScanResult {
  blocked: boolean;
  reason?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
}

export function scanSecurity(request: UserRequest, metadata: ExtractedMetadata): SecurityScanResult {
  const flags: string[] = [];
  const text = request.prompt;

  for (const p of BLOCKED_PATTERNS) {
    if (p.test(text)) flags.push(`blocked_pattern:${p.source}`);
  }
  for (const p of ESCALATION_BLOCK) {
    if (p.test(text)) flags.push(`escalation_block:${p.source}`);
  }

  if (metadata.risk > 0.9) flags.push('metadata_risk_critical');

  const blocked = flags.some((f) => f.startsWith('blocked_pattern') || f.startsWith('escalation_block'));
  const risk_level =
    metadata.risk > 0.85 || blocked
      ? 'critical'
      : metadata.risk > 0.6
        ? 'high'
        : metadata.risk > 0.35
          ? 'medium'
          : 'low';

  return {
    blocked,
    reason: blocked ? `Unsafe action detected: ${flags.join('; ')}` : undefined,
    risk_level,
    flags,
  };
}
