import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseResult } from './case';

export type Baseline = {
  updatedAt: string;
  modelId: string;
  passing: string[];
};

const BASELINE_PATH = join(process.cwd(), 'eval', 'baseline.json');

export function readBaseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
}

export function writeBaseline(results: CaseResult[], modelId: string): void {
  const baseline: Baseline = {
    updatedAt: new Date().toISOString(),
    modelId,
    passing: results.filter((result) => result.ok).map((result) => result.id),
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

export function regressions(
  results: CaseResult[],
  baseline: Baseline | null,
): CaseResult[] {
  if (!baseline) return [];
  return results.filter(
    (result) => !result.ok && baseline.passing.includes(result.id),
  );
}

export function formatReport(
  results: CaseResult[],
  baseline: Baseline | null,
  modelId: string,
): string {
  const passed = results.filter((result) => result.ok);
  const rate = results.length === 0 ? 0 : passed.length / results.length;
  const lost = regressions(results, baseline).map((result) => result.id);

  const lines = results.map((result) => {
    const mark = result.ok ? '✓' : lost.includes(result.id) ? '↓' : '✗';
    const timing = `${(result.ms / 1000).toFixed(1)}s`;
    const said = result.text
      ? `\n      disse: ${result.text.replace(/\s+/g, ' ').slice(0, 200)}`
      : '';
    const detail = result.ok ? '' : `\n      ${result.detail}${said}`;
    return `  ${mark} ${result.id} (${timing})${detail}`;
  });

  const known = results.filter(
    (result) => !result.ok && !lost.includes(result.id),
  );
  const gained = baseline
    ? results.filter(
        (result) => result.ok && !baseline.passing.includes(result.id),
      )
    : [];

  const summary: (string | null)[] = [
    `  acerto: ${passed.length}/${results.length} (${(rate * 100).toFixed(0)}%)`,
    baseline
      ? `  baseline de ${baseline.updatedAt.slice(0, 10)} (${baseline.modelId}): ${baseline.passing.length}/${results.length}`
      : '  baseline: ausente — rode com EVAL_UPDATE_BASELINE=1 para gravar o primeiro',
    lost.length > 0
      ? `  regrediram: ${lost.join(', ')}`
      : '  regrediram: nenhum',
    known.length > 0
      ? `  falhas já conhecidas: ${known.map((result) => result.id).join(', ')}`
      : null,
    gained.length > 0
      ? `  passaram a acertar: ${gained.map((result) => result.id).join(', ')}`
      : null,
  ];

  return [
    '',
    `eval do agente — modelo ${modelId}`,
    ...lines,
    '',
    ...summary.filter((line): line is string => line !== null),
    '',
  ].join('\n');
}
