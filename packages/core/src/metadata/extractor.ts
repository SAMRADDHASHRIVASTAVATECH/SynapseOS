import { clamp01, type ExtractedMetadata, type UserRequest } from '../types.js';

/* ═══════════════════════════════════════════════════════════════
   PHASE 1 — SEMANTIC INTENT DETECTION
   Weighted phrase groups with confidence scoring instead of
   first-match keyword scanning.
   ═══════════════════════════════════════════════════════════════ */

interface SemanticSignal {
  intent: string;
  /** Each phrase carries a weight; total weight determines confidence */
  phrases: Array<{ pattern: RegExp; weight: number }>;
}

const SEMANTIC_INTENTS: SemanticSignal[] = [
  {
    intent: 'creative',
    phrases: [
      { pattern: /\bbrainstorm\b/i, weight: 0.9 },
      { pattern: /\bideate?\b/i, weight: 0.85 },
      { pattern: /\bideation\b/i, weight: 0.85 },
      { pattern: /\bstartup\s+ideas?\b/i, weight: 0.8 },
      { pattern: /\binnovati(?:on|ve)\b/i, weight: 0.75 },
      { pattern: /\bimagine\b/i, weight: 0.7 },
      { pattern: /\bconcept\s+generation\b/i, weight: 0.8 },
      { pattern: /\bcreative\b/i, weight: 0.7 },
      { pattern: /\bvariants?\b/i, weight: 0.4 },
      { pattern: /\bexploratory\b/i, weight: 0.6 },
      { pattern: /\binvention\b/i, weight: 0.7 },
      { pattern: /\bfuturistic\b/i, weight: 0.65 },
      { pattern: /\bdesign\s+alternatives?\b/i, weight: 0.8 },
      { pattern: /\balternatives?\s+for\b/i, weight: 0.55 },
      { pattern: /\bgenerate\s+ideas?\b/i, weight: 0.85 },
      { pattern: /\bwhat\s+if\b/i, weight: 0.4 },
      { pattern: /\breimagine\b/i, weight: 0.7 },
      { pattern: /\benvision\b/i, weight: 0.65 },
    ],
  },
  {
    intent: 'coordinate',
    phrases: [
      { pattern: /\blarge\s+(?:mono)?repo\b/i, weight: 0.8 },
      { pattern: /\bscalable\s+(?:architecture|microservices?|systems?)\b/i, weight: 0.85 },
      { pattern: /\bdistributed\s+systems?\b/i, weight: 0.8 },
      { pattern: /\bmicroservices?\b/i, weight: 0.7 },
      { pattern: /\bci\s*\/?\s*cd\b/i, weight: 0.6 },
      { pattern: /\bdeployment\s+workflows?\b/i, weight: 0.65 },
      { pattern: /\bobservability\b/i, weight: 0.6 },
      { pattern: /\borchestrat(?:e|ion)\b/i, weight: 0.75 },
      { pattern: /\binfrastructure\b/i, weight: 0.55 },
      { pattern: /\bperformance\s+optimiz/i, weight: 0.5 },
      { pattern: /\benterprise\s+systems?\b/i, weight: 0.7 },
      { pattern: /\bplatform\s+architecture\b/i, weight: 0.8 },
      { pattern: /\bmulti[- ]service\b/i, weight: 0.7 },
      { pattern: /\bcross[- ]system\b/i, weight: 0.7 },
      { pattern: /\bmigration\b/i, weight: 0.45 },
      { pattern: /\btransformation\b/i, weight: 0.5 },
      { pattern: /\bparallel\b/i, weight: 0.5 },
      { pattern: /\bmultiple\s+agents?\b/i, weight: 0.7 },
      { pattern: /\bdecompose\b/i, weight: 0.6 },
      { pattern: /\bend[- ]to[- ]end\b/i, weight: 0.55 },
      { pattern: /\bfull[- ]stack\b/i, weight: 0.5 },
    ],
  },
  {
    intent: 'research',
    phrases: [
      { pattern: /\bresearch\b/i, weight: 0.9 },
      { pattern: /\binvestigate\b/i, weight: 0.8 },
      { pattern: /\bexplore\b/i, weight: 0.6 },
      { pattern: /\bcompare\b/i, weight: 0.8 },
      { pattern: /\bsurvey\b/i, weight: 0.7 },
      { pattern: /\banalyze\b/i, weight: 0.7 },
      { pattern: /\bevaluate\b/i, weight: 0.7 },
      { pattern: /\btradeoffs?\b/i, weight: 0.75 },
      { pattern: /\bbenchmark\b/i, weight: 0.7 },
      { pattern: /\bpros\s+and\s+cons\b/i, weight: 0.8 },
      { pattern: /\bcomparison\b/i, weight: 0.75 },
      { pattern: /\bstudy\b/i, weight: 0.5 },
    ],
  },
  {
    intent: 'debug',
    phrases: [
      { pattern: /\bdebug\b/i, weight: 0.9 },
      { pattern: /\bfix\s+(?:bug|issue|this|it)\b/i, weight: 0.85 },
      { pattern: /\bfailing\b/i, weight: 0.7 },
      { pattern: /\bcrash(?:es|ing)?\b/i, weight: 0.8 },
      { pattern: /\b(?:why|is\s+it)\s+crashing\b/i, weight: 0.9 },
      { pattern: /\berror\b/i, weight: 0.6 },
      { pattern: /\bmemory\s+leak\b/i, weight: 0.85 },
      { pattern: /\bstack\s*trace\b/i, weight: 0.85 },
      { pattern: /\btraceback(?:\s+\(most recent call last\))?/i, weight: 0.95 },
      { pattern: /at\s+.*:\d+:\d+/i, weight: 0.9 },
      { pattern: /\b(?:TypeError|ValueError|KeyError|SyntaxError|ReferenceError|AttributeError|ImportError|ModuleNotFoundError|RuntimeError|RangeError)\b/i, weight: 0.9 },
      { pattern: /Cannot read properties of undefined/i, weight: 0.95 },
      { pattern: /UnhandledPromiseRejection|ERR_MODULE_NOT_FOUND/i, weight: 0.9 },
      { pattern: /Hydration failed|React rendering error|Build failed|Module parse failed/i, weight: 0.85 },
      { pattern: /\b(?:NullPointerException|ClassNotFoundException|IllegalArgumentException|StackOverflowError)\b/i, weight: 0.9 },
      { pattern: /\b(?:NullReferenceException|InvalidOperationException)\b/i, weight: 0.9 },
      { pattern: /\bCS\d{4}\b/i, weight: 0.8 },
      { pattern: /Segmentation fault|Undefined reference|Access violation|Core dumped/i, weight: 0.95 },
      { pattern: /thread panicked at|borrow checker|mismatched types/i, weight: 0.9 },
      { pattern: /panic:|nil pointer dereference|fatal error/i, weight: 0.9 },
      { pattern: /Fatal error|Parse error|Undefined index|Composer dependency/i, weight: 0.9 },
      { pattern: /\b(?:NoMethodError|NameError)\b/i, weight: 0.9 },
      { pattern: /Gem load error/i, weight: 0.85 },
      { pattern: /EXC_BAD_ACCESS/i, weight: 0.95 },
      { pattern: /\bKotlinNullPointerException\b/i, weight: 0.95 },
      { pattern: /JVM runtime/i, weight: 0.85 },
      { pattern: /connection refused|deadlock detected|syntax error near|duplicate key violation|migration failed/i, weight: 0.9 },
      { pattern: /container exited|image pull failed|permission denied|port already in use/i, weight: 0.9 },
      { pattern: /command not found|out of memory|killed process/i, weight: 0.9 },
      { pattern: /merge conflict|detached HEAD|failed to push|authentication failed/i, weight: 0.85 },
      { pattern: /\bdiagnose\b/i, weight: 0.75 },
      { pattern: /\bbroken\b/i, weight: 0.6 },
      { pattern: /\bit'?s\s+broken\b/i, weight: 0.8 },
      { pattern: /\bnot\s+working\b/i, weight: 0.8 },
      { pattern: /\btroubleshoot\b/i, weight: 0.8 },
      { pattern: /\bhelp\b/i, weight: 0.5 },
    ],
  },
  {
    intent: 'review',
    phrases: [
      { pattern: /\breview\b/i, weight: 0.85 },
      { pattern: /\bcritique\b/i, weight: 0.8 },
      { pattern: /\baudit\b/i, weight: 0.85 },
      { pattern: /\binspect\b/i, weight: 0.6 },
      { pattern: /\bassess\b/i, weight: 0.6 },
      { pattern: /\bvalidate\b/i, weight: 0.5 },
      { pattern: /\bsecurity\s+review\b/i, weight: 0.9 },
      { pattern: /\bscalability\s+review\b/i, weight: 0.9 },
      { pattern: /\bpr\s+review\b/i, weight: 0.9 },
      { pattern: /\bcode\s+quality\b/i, weight: 0.7 },
    ],
  },
  {
    intent: 'build',
    phrases: [
      { pattern: /\bimplement\b/i, weight: 0.85 },
      { pattern: /\bcreate\b/i, weight: 0.6 },
      { pattern: /\bbuild\b/i, weight: 0.7 },
      { pattern: /\bscaffold\b/i, weight: 0.8 },
      { pattern: /\badd\s+feature\b/i, weight: 0.8 },
      { pattern: /\bwrite\s+code\b/i, weight: 0.85 },
      { pattern: /\bdevelop\b/i, weight: 0.6 },
      { pattern: /\bconstruct\b/i, weight: 0.55 },
    ],
  },
  {
    intent: 'execute',
    phrases: [
      { pattern: /\brun\b/i, weight: 0.5 },
      { pattern: /\bexecute\b/i, weight: 0.6 },
      { pattern: /\bdeploy\b/i, weight: 0.65 },
      { pattern: /\bmigrate\b/i, weight: 0.5 },
    ],
  },
  {
    intent: 'query',
    phrases: [
      { pattern: /\bwhat\s+is\b/i, weight: 0.8 },
      { pattern: /\bhow\s+does\b/i, weight: 0.7 },
      { pattern: /\bexplain\b/i, weight: 0.7 },
      { pattern: /\bdescribe\b/i, weight: 0.6 },
    ],
  },
  {
    intent: 'discussion',
    phrases: [
      { pattern: /\bdiscuss\b/i, weight: 0.8 },
      { pattern: /\bthoughts on\b/i, weight: 0.7 },
      { pattern: /\bwhat do you think\b/i, weight: 0.8 },
      { pattern: /\bengineering management\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'brainstorming',
    phrases: [
      { pattern: /\bbrainstorm\b/i, weight: 0.9 },
      { pattern: /\bideate?\b/i, weight: 0.85 },
      { pattern: /\bstartup\s+ideas?\b/i, weight: 0.8 },
    ],
  },
  {
    intent: 'refinement',
    phrases: [
      { pattern: /\brefine\b/i, weight: 0.8 },
      { pattern: /\bpolish\b/i, weight: 0.8 },
      { pattern: /\btweak\b/i, weight: 0.7 },
      { pattern: /\bimprove\b/i, weight: 0.6 },
    ],
  },
  {
    intent: 'architecture_discussion',
    phrases: [
      { pattern: /\bimprove the architecture\b/i, weight: 0.9 },
      { pattern: /\barchitecture refinement\b/i, weight: 0.85 },
      { pattern: /\bdiscuss(?:ing)? architecture\b/i, weight: 0.9 },
    ],
  },
  {
    intent: 'planning',
    phrases: [
      { pattern: /\bplan(?:ning)?\b/i, weight: 0.8 },
      { pattern: /\broadmap\b/i, weight: 0.8 },
      { pattern: /\bstrategy\b/i, weight: 0.7 },
      { pattern: /\bproduct planning\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'educational',
    phrases: [
      { pattern: /\bteach me\b/i, weight: 0.8 },
      { pattern: /\bhow does\b/i, weight: 0.7 },
      { pattern: /\bexplain\b/i, weight: 0.7 },
      { pattern: /\bwhat is\b/i, weight: 0.7 },
      { pattern: /\bunderstand\b/i, weight: 0.6 },
    ],
  },
  {
    intent: 'conversational_followup',
    phrases: [
      { pattern: /\bthis still feels (?:weak|shallow|generic)\b/i, weight: 0.9 },
      { pattern: /\bkeep (?:everything else|the rest) intact\b/i, weight: 0.9 },
      { pattern: /\bimprove that part\b/i, weight: 0.8 },
      { pattern: /\bmake this smarter\b/i, weight: 0.8 },
      { pattern: /\bthe previous routing\b/i, weight: 0.85 },
      { pattern: /\bmake this more intelligent\b/i, weight: 0.8 },
      { pattern: /\bdon'?t rebuild\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'strategic_iteration',
    phrases: [
      { pattern: /\bstrategic iteration\b/i, weight: 0.9 },
      { pattern: /\bpivot\b/i, weight: 0.7 },
      { pattern: /\bscale better\b/i, weight: 0.8 },
    ],
  },
  {
    intent: 'orchestration_refinement',
    phrases: [
      { pattern: /\bmake the orchestration smarter\b/i, weight: 0.9 },
      { pattern: /\brouting should think deeper\b/i, weight: 0.9 },
      { pattern: /\bonly refine the orchestration\b/i, weight: 0.9 },
      { pattern: /\bimprove the routing\b/i, weight: 0.9 },
    ],
  },
  {
    intent: 'workflow_refinement',
    phrases: [
      { pattern: /\bworkflow understanding\b/i, weight: 0.85 },
      { pattern: /\bimprove the reasoning here\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'system_improvement',
    phrases: [
      { pattern: /\bdoesn't feel production[- ]ready\b/i, weight: 0.9 },
      { pattern: /\bpolish the (?:platform|system)\b/i, weight: 0.9 },
      { pattern: /\bneeds to feel more production[- ]grade\b/i, weight: 0.9 },
    ],
  },
  {
    intent: 'failure_analysis',
    phrases: [
      { pattern: /\bfailure\s+analysis\b/i, weight: 0.9 },
      { pattern: /\bpost[- ]mortem\b/i, weight: 0.9 },
      { pattern: /\broot\s+cause\b/i, weight: 0.9 },
      { pattern: /\bwhy\s+did\s+this\s+fail\b/i, weight: 0.85 },
      { pattern: /\bincident\s+report\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'infrastructure_troubleshooting',
    phrases: [
      { pattern: /\binfrastructure\s+troubleshooting\b/i, weight: 0.9 },
      { pattern: /\bnetwork\s+issue\b/i, weight: 0.85 },
      { pattern: /\bserver\s+down\b/i, weight: 0.85 },
      { pattern: /\bdns\s+failure\b/i, weight: 0.85 },
    ],
  },
  {
    intent: 'deployment_troubleshooting',
    phrases: [
      { pattern: /\bdeployment\s+troubleshooting\b/i, weight: 0.9 },
      { pattern: /\bdeploy\s+failed\b/i, weight: 0.9 },
      { pattern: /\berror\s+after\s+deploy\b/i, weight: 0.95 },
      { pattern: /\bpipeline\s+failed\b/i, weight: 0.85 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   PHASE 3 — MULTI-DOMAIN DETECTION
   Detect simultaneous presence of engineering domains.
   ═══════════════════════════════════════════════════════════════ */

const DOMAIN_SIGNALS: Array<{ domain: string; patterns: RegExp[] }> = [
  { domain: 'frontend', patterns: [/\breact\b/i, /\bvue\b/i, /\bcss\b/i, /\bui\b/i, /\bcomponent\b/i, /\bdashboard\b/i, /\bfrontend\b/i] },
  { domain: 'backend', patterns: [/\bapi\b/i, /\bserver\b/i, /\bdatabase\b/i, /\bsql\b/i, /\bexpress\b/i, /\bfastapi\b/i, /\bbackend\b/i, /\bgraphql\b/i] },
  { domain: 'infrastructure', patterns: [/\bci\s*\/?\s*cd\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bterraform\b/i, /\binfrastructure\b/i, /\bhelm\b/i] },
  { domain: 'observability', patterns: [/\bobservability\b/i, /\blogging\b/i, /\bmonitoring\b/i, /\bmetrics\b/i, /\btracing\b/i, /\balerting\b/i, /\btelemetry\b/i] },
  { domain: 'security', patterns: [/\bsecurity\b/i, /\bauthenticat/i, /\bauthoriz/i, /\bcredential\b/i, /\bsecret\b/i, /\boauth\b/i, /\bvulnerabilit/i, /\bencryption\b/i] },
  { domain: 'deployment', patterns: [/\bdeploy/i, /\brelease\b/i, /\brollback\b/i, /\bstaging\b/i, /\bproduction\b/i, /\bcanary\b/i, /\bblue[- ]green\b/i] },
  { domain: 'performance', patterns: [/\bperformance\b/i, /\boptimiz/i, /\bcaching\b/i, /\blatency\b/i, /\bthroughput\b/i, /\bscalab/i] },
  { domain: 'data', patterns: [/\betl\b/i, /\banalytics\b/i, /\bpipeline\b/i, /\bdataset\b/i, /\bdata\s+engineer/i, /\bbig\s+data\b/i] },
  { domain: 'devops', patterns: [/\bdevops\b/i, /\bci\b/i, /\bcd\b/i, /\bpipeline\b/i, /\bautomation\b/i] },
  { domain: 'networking', patterns: [/\bnetwork/i, /\bload\s+balanc/i, /\bproxy\b/i, /\bdns\b/i, /\bgateway\b/i, /\bmesh\b/i] },
  { domain: 'orchestration', patterns: [/\borchestrat/i, /\bworkflow\s+engine\b/i, /\bdag\b/i, /\bstate\s+machine\b/i] },
  { domain: 'distributed_systems', patterns: [/\bdistributed\s+systems?\b/i, /\bconsensus\b/i, /\beventual\s+consistency\b/i, /\braft\b/i, /\bpaxos\b/i] },
  { domain: 'platform_architecture', patterns: [/\bplatform\s+architecture\b/i, /\benterprise\s+architecture\b/i, /\bsystem\s+design\b/i] },
  { domain: 'analytics', patterns: [/\banalytics\b/i, /\btelemetry\b/i, /\bdata\s+lake\b/i, /\bwarehouse\b/i] },
  { domain: 'memory_systems', patterns: [/\bmemory\s+systems?\b/i, /\bvector\s+database\b/i, /\bcontext\s+window\b/i, /\brag\b/i] },
  { domain: 'autonomous_systems', patterns: [/\bautonomous\b/i, /\bagentic\b/i, /\bmulti[- ]agent\b/i, /\bai\s+operating\s+system\b/i] },
  { domain: 'linux', patterns: [/\blinux\b/i, /\bbash\b/i, /\bshell\b/i, /\bubuntu\b/i, /\bcentos\b/i, /\bsystemd\b/i] },
  { domain: 'git', patterns: [/\bgit\b/i, /\bgithub\b/i, /\bgitlab\b/i, /\bversion\s+control\b/i] },
];

/* ═══════════════════════════════════════════════════════════════
   PHASE 2 — SEMANTIC COMPLEXITY SIGNALS
   Weighted architectural breadth markers.
   ═══════════════════════════════════════════════════════════════ */

const COMPLEXITY_SIGNALS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /\bmicroservices?\b/i, weight: 0.18, label: 'microservices' },
  { pattern: /\bdistributed\b/i, weight: 0.16, label: 'distributed_systems' },
  { pattern: /\barchitecture\b/i, weight: 0.14, label: 'architecture' },
  { pattern: /\brefactor\b/i, weight: 0.14, label: 'refactoring' },
  { pattern: /\bci\s*\/?\s*cd\b/i, weight: 0.10, label: 'ci_cd' },
  { pattern: /\bobservability\b/i, weight: 0.10, label: 'observability' },
  { pattern: /\bdeployment\b/i, weight: 0.08, label: 'deployment' },
  { pattern: /\bauthenticat/i, weight: 0.08, label: 'authentication' },
  { pattern: /\boptimiz/i, weight: 0.08, label: 'optimization' },
  { pattern: /\bscalab/i, weight: 0.12, label: 'scalability' },
  { pattern: /\bworkflows?\b/i, weight: 0.06, label: 'workflows' },
  { pattern: /\binfrastructure\b/i, weight: 0.10, label: 'infrastructure' },
  { pattern: /\bend[- ]to[- ]end\b/i, weight: 0.12, label: 'end_to_end' },
  { pattern: /\bplatform\b/i, weight: 0.08, label: 'platform' },
  { pattern: /\benterprise\b/i, weight: 0.10, label: 'enterprise' },
  { pattern: /\bmigration\b/i, weight: 0.08, label: 'migration' },
  { pattern: /\bmonorepo\b/i, weight: 0.10, label: 'monorepo' },
  { pattern: /\bsystem\b/i, weight: 0.05, label: 'system' },
  { pattern: /\bmultiple\b/i, weight: 0.04, label: 'multiple' },
  { pattern: /\bmemory\s+leak\b/i, weight: 0.18, label: 'severe_debug(memory_leak)' },
  { pattern: /\bcrash(?:es|ing)?\b/i, weight: 0.12, label: 'severe_debug(crash)' },
  { pattern: /\bconcurrency\b/i, weight: 0.18, label: 'severe_debug(concurrency)' },
  { pattern: /\bproduction\s+instability\b/i, weight: 0.20, label: 'severe_debug(production_instability)' },
  { pattern: /\bdeadlock\b/i, weight: 0.15, label: 'severe_debug(deadlock)' },
  { pattern: /\brace\s+condition\b/i, weight: 0.15, label: 'severe_debug(race_condition)' },
];

const TOOL_KEYWORDS: Record<string, RegExp> = {
  search: /search|find|lookup/i,
  write: /write|edit|modify|create file/i,
  execute: /run|execute|test|npm|build/i,
  fetch: /fetch|http|url|api call/i,
  delegate: /parallel|workers|agents|decompose/i,
  merge: /merge|combine|synthesize/i,
};

const RISK_KEYWORDS = [
  /delete\s+all/i,
  /drop\s+table/i,
  /rm\s+-rf/i,
  /force\s+push/i,
  /production\s+deploy/i,
  /exfiltrat/i,
  /password|api[_-]?key|secret/i,
];

/* ═══════════════════════════════════════════════════════════════
   SEMANTIC INTENT SCORING
   Scores ALL intents in parallel and picks the highest-weighted.
   ═══════════════════════════════════════════════════════════════ */

interface IntentScore {
  intent: string;
  score: number;
  matches: string[];
}

function scoreIntents(prompt: string): IntentScore[] {
  const results: IntentScore[] = [];
  for (const signal of SEMANTIC_INTENTS) {
    let score = 0;
    const matches: string[] = [];
    for (const { pattern, weight } of signal.phrases) {
      if (pattern.test(prompt)) {
        score += weight;
        matches.push(pattern.source);
      }
    }
    if (score > 0) results.push({ intent: signal.intent, score, matches });
  }
  return results.sort((a, b) => b.score - a.score);
}

function detectSemanticIntent(prompt: string, trace: string[]): { winner: string, all: string[] } {
  const scores = scoreIntents(prompt);
  if (!scores.length) {
    trace.push('semantic:intent=general(no_matches)');
    return { winner: 'general', all: ['general'] };
  }

  const winner = scores[0]!;
  for (const s of scores.slice(0, 4)) {
    trace.push(`semantic:intent_candidate=${s.intent}(score=${s.score.toFixed(2)},hits=[${s.matches.slice(0, 3).join(',')}])`);
  }

  // If coordinate signals are strong AND another intent is close, coordinate wins
  const coordScore = scores.find((s) => s.intent === 'coordinate');
  if (coordScore && coordScore !== winner && coordScore.score > 1.2 && winner.intent !== 'debug') {
    trace.push(`semantic:escalation coordinate(${coordScore.score.toFixed(2)}) overrides ${winner.intent}(${winner.score.toFixed(2)})`);
    return { winner: 'coordinate', all: scores.map(s => s.intent) };
  }

  trace.push(`semantic:intent_winner=${winner.intent}(score=${winner.score.toFixed(2)})`);
  return { winner: winner.intent, all: scores.map(s => s.intent) };
}

/* ═══════════════════════════════════════════════════════════════
   MULTI-DOMAIN CLUSTERING
   ═══════════════════════════════════════════════════════════════ */

function detectDomains(prompt: string, files: string[] | undefined, trace: string[]): { primary: string; domains: string[]; count: number } {
  const combined = `${prompt} ${(files ?? []).join(' ')}`;
  const detected: string[] = [];

  for (const { domain, patterns } of DOMAIN_SIGNALS) {
    if (patterns.some((p) => p.test(combined))) detected.push(domain);
  }

  if (detected.length > 1) {
    trace.push(`semantic:multi_domain=[${detected.join(',')}](count=${detected.length})`);
  }

  const primary = detected.length > 0 ? detected[0]! : 'general';
  trace.push(`semantic:primary_domain=${primary}`);

  return { primary, domains: detected, count: detected.length };
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2 — SEMANTIC COMPLEXITY ENGINE
   ═══════════════════════════════════════════════════════════════ */

function estimateComplexity(prompt: string, files: string[] | undefined, domainCount: number, trace: string[]): number {
  let score = 0.15;
  const contributors: string[] = [];

  // Word-count baseline
  const words = prompt.split(/\s+/).length;
  if (words > 80) { score += 0.15; contributors.push(`word_count(${words})`); }
  else if (words > 40) { score += 0.08; contributors.push(`word_count(${words})`); }
  else if (words > 15) { score += 0.03; }

  // Conjunction / compound signals
  const conjunctions = (prompt.match(/\band\b|\bthen\b|\balso\b|\bwith\b|\bplus\b/gi) ?? []).length;
  if (conjunctions >= 3) { score += 0.18; contributors.push(`conjunctions(${conjunctions})`); }
  else if (conjunctions >= 1) { score += conjunctions * 0.05; }

  // File count
  if ((files?.length ?? 0) > 3) { score += 0.1; contributors.push('many_files'); }

  // Semantic complexity signals
  for (const { pattern, weight, label } of COMPLEXITY_SIGNALS) {
    if (pattern.test(prompt)) {
      score += weight;
      contributors.push(label);
    }
  }

  // Multi-domain multiplier
  if (domainCount >= 4) {
    score += 0.20;
    contributors.push(`domain_breadth(${domainCount})`);
  } else if (domainCount >= 3) {
    score += 0.12;
    contributors.push(`domain_breadth(${domainCount})`);
  } else if (domainCount >= 2) {
    score += 0.06;
    contributors.push(`domain_breadth(${domainCount})`);
  }

  const clamped = clamp01(score);
  if (contributors.length > 0) {
    trace.push(`semantic:complexity=${clamped.toFixed(2)}[${contributors.join(',')}]`);
  }
  return clamped;
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 4 — WORKFLOW DEPTH ESTIMATION
   ═══════════════════════════════════════════════════════════════ */

function estimateWorkflowDepth(
  prompt: string,
  intent: string,
  complexity: number,
  domainCount: number,
  files: string[] | undefined,
  trace: string[],
): number {
  const factors: string[] = [];
  let depth = 0;

  // Intent-based baseline
  if (intent === 'coordinate') { depth += 0.40; factors.push('coordinate_intent'); }
  else if (intent === 'research') { depth += 0.30; factors.push('research_intent'); }
  else if (intent === 'build') { depth += 0.15; factors.push('build_intent'); }
  else if (intent === 'debug' && complexity > 0.4) { depth += 0.25; factors.push('severe_debug_intent'); }

  // Complexity contribution
  depth += complexity * 0.35;

  // Multi-domain escalation
  if (domainCount >= 4) { depth += 0.25; factors.push(`multi_domain(${domainCount})`); }
  else if (domainCount >= 3) { depth += 0.15; factors.push(`multi_domain(${domainCount})`); }
  else if (domainCount >= 2) { depth += 0.08; factors.push(`multi_domain(${domainCount})`); }

  // Sequential dependency chains
  const seqSignals = (prompt.match(/\bthen\b|\bafter\b|\bfollowed\s+by\b|\bfinally\b/gi) ?? []).length;
  if (seqSignals >= 2) { depth += 0.12; factors.push(`sequential_deps(${seqSignals})`); }

  // File / scope boost
  if ((files?.length ?? 0) > 0) depth += 0.05;

  // Large-scale keywords
  if (/\blarge[- ]scale\b|\benterprise\b|\bplatform\b/i.test(prompt)) {
    depth += 0.10;
    factors.push('large_scale');
  }

  const clamped = clamp01(depth);
  if (factors.length > 0) {
    trace.push(`semantic:workflow_depth=${clamped.toFixed(2)}[${factors.join(',')}]`);
  }
  return clamped;
}

/* ═══════════════════════════════════════════════════════════════
   REMAINING HELPERS (risk, tools, output format)
   ═══════════════════════════════════════════════════════════════ */

function estimateRisk(prompt: string): number {
  let risk = 0.1;
  for (const p of RISK_KEYWORDS) {
    if (p.test(prompt)) risk += 0.25;
  }
  if (/unsafe|destructive|irreversible/i.test(prompt)) risk += 0.2;
  if (/rm\s+-rf|drop\s+table|drop\s+database|format\s+c:/i.test(prompt)) risk = Math.max(risk, 0.92);
  return clamp01(risk);
}

function detectTools(prompt: string): string[] {
  const tools: string[] = [];
  for (const [tool, pattern] of Object.entries(TOOL_KEYWORDS)) {
    if (pattern.test(prompt)) tools.push(tool);
  }
  return tools.length ? tools : ['read'];
}

function detectOutputFormat(prompt: string, intent: string): string {
  if (/json|schema/i.test(prompt)) return 'json';
  if (/markdown|report|document/i.test(prompt)) return 'markdown';
  if (/code|patch|diff/i.test(prompt)) return 'code';
  if (intent === 'research') return 'markdown';
  if (intent === 'review') return 'findings';
  if (intent === 'creative') return 'text';
  return 'text';
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API — extractMetadata
   Semantic hybrid pipeline: weighted phrases → domain clustering
   → complexity engine → workflow depth → output.
   Fully deterministic. No randomness, stable ordering.
   ═══════════════════════════════════════════════════════════════ */

export function extractMetadata(request: UserRequest): ExtractedMetadata {
  const trace: string[] = [];
  const prompt = (request.prompt || '').trim();
  const safeFiles = request.files || [];
  trace.push('tier1:normalize_input');

  // Phase 1: semantic intent
  const intentData = detectSemanticIntent(prompt, trace);
  const intent = intentData.winner;
  const intents = intentData.all;

  // Phase 3: multi-domain detection
  const domainInfo = detectDomains(prompt, safeFiles, trace);

  // Phase 2: semantic complexity
  const complexity = estimateComplexity(prompt, safeFiles, domainInfo.count, trace);

  // Phase 4: workflow depth
  const workflow_depth = estimateWorkflowDepth(prompt, intent, complexity, domainInfo.count, safeFiles, trace);

  // Remaining metadata
  const risk = estimateRisk(prompt);
  const required_tools = detectTools(prompt);
  const ambiguity = clamp01(
    (prompt.match(/\?/g)?.length ?? 0) * 0.1 +
    (/maybe|either|or\s+/i.test(prompt) ? 0.2 : 0) +
    (intent === 'creative' ? 0.15 : 0),
  );
  const urgency = /urgent|asap|immediately|critical/i.test(prompt) ? 0.85 : 0.3;
  let memory_relevance = request.sessionId ? 0.6 : 0.2;
  const followup_intents = ['conversational_followup', 'refinement', 'orchestration_refinement', 'workflow_refinement', 'system_improvement', 'strategic_iteration'];
  if (followup_intents.includes(intent)) {
    memory_relevance = 0.95;
    trace.push(`conversational:memory_relevance=high(${intent})`);
  }
  const execution_cost = clamp01(complexity * 0.4 + workflow_depth * 0.4 + risk * 0.2);
  const output_format = detectOutputFormat(prompt, intent);

  const method = trace.some((t) => t.startsWith('semantic:escalation'))
    ? 'hybrid'
    : trace.some((t) => t.startsWith('semantic:multi_domain'))
      ? 'hybrid'
      : trace.some((t) => t.startsWith('semantic:'))
        ? 'heuristic'
        : 'rule';

  trace.push(`hybrid:method=${method}`);
  trace.push(`tier1:domain_count=${domainInfo.count}`);

  return {
    intent,
    intents,
    domain: domainInfo.primary,
    complexity,
    urgency,
    risk,
    ambiguity,
    output_format,
    required_tools,
    memory_relevance,
    workflow_depth,
    execution_cost,
    extraction_method: method,
    extraction_trace: trace,
  };
}
