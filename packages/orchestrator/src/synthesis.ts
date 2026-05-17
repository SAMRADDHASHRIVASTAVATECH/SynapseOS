import type { ModeId, WorkerResult, ExtractedMetadata } from '@atlas/core';

export function synthesizeOutput(
  modeId: ModeId,
  prompt: string,
  metadata: ExtractedMetadata,
  workers: WorkerResult[],
  securityBlocked: boolean,
): string {
  if (securityBlocked) {
    return `## Safety Gate\nRequest blocked by policy. Risk=${metadata.risk.toFixed(2)}. No execution performed.`;
  }

  const sections = workers.map(
    (w) => `### ${w.worker_id} (${w.mode_id})\n${w.output}\nArtifacts: ${w.artifacts.join(', ')}`,
  );

  const header = formatHeader(modeId, metadata);
  return `${header}\n\n**Prompt:** ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}\n\n${sections.join('\n\n')}\n\n---\n*Synthesized by Atlas (${modeId})*`;
}

function formatHeader(modeId: ModeId, meta: ExtractedMetadata): string {
  const styles: Record<ModeId, string> = {
    individual: '## Direct Response',
    multi_agent: '## Multi-Agent Synthesis',
    research: '## Research Findings',
    build: '## Build Output',
    review: '## Review Summary',
    debug: '## Debug Report',
    creative: '## Creative Alternatives',
    safety: '## Safety Notice',
  };
  return `${styles[modeId]}\nIntent: ${meta.intent} | Domain: ${meta.domain} | Complexity: ${meta.complexity.toFixed(2)}`;
}
