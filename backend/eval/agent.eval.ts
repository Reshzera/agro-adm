import type { CaseResult } from './setup/case';
import { cases } from './setup/cases';
import { createEvalModel, type EvalModel } from './setup/model';
import {
  formatReport,
  readBaseline,
  regressions,
  writeBaseline,
} from './setup/report';
import { SANTA_CLARA } from './setup/fixtures';
import {
  approvalGatedTools,
  executableTools,
  runCases,
  toolInputFields,
} from './setup/run-case';
import { cattleWriteAttempts } from './setup/world';

const CATTLE_TOOLS = ['getCattleOverview', 'createCattleLot', 'moveCattleLot'];

const THRESHOLD = Number(process.env.EVAL_THRESHOLD ?? '0.9');
const MAX_REGRESSIONS = Number(process.env.EVAL_MAX_REGRESSIONS ?? '3');
const ONLY = process.env.EVAL_ONLY?.split(',').map((id) => id.trim());

describe('eval do loop do agente', () => {
  let evalModel: EvalModel;
  let results: CaseResult[];

  beforeAll(async () => {
    evalModel = await createEvalModel();
    results = await runCases(
      evalModel.model,
      ONLY ? cases.filter((item) => ONLY.includes(item.id)) : cases,
    );

    console.log(formatReport(results, readBaseline(), evalModel.modelId));
    if (process.env.EVAL_UPDATE_BASELINE === '1' && !ONLY) {
      writeBaseline(results, evalModel.modelId);
    }
  });

  afterAll(async () => {
    await evalModel?.close();
  });

  it('acerta a tool e os argumentos acima do limiar', () => {
    const failures = results
      .filter((result) => !result.ok)
      .map((result) => `${result.id} — ${result.detail}`);
    const rate = (results.length - failures.length) / results.length;

    expect(rate >= THRESHOLD ? [] : failures).toEqual([]);
    expect(rate).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it('não acumula regressões contra o baseline', () => {
    const lost = regressions(results, readBaseline()).map(
      (result) => `${result.id} — ${result.detail}`,
    );

    expect(lost.length < MAX_REGRESSIONS ? [] : lost).toEqual([]);
  });

  it('nunca deixa o modelo escolher a fazenda', () => {
    const chosen = results
      .flatMap((result) => result.calls)
      .filter((call) => 'farmId' in call.input);

    expect(chosen).toEqual([]);
  });

  it('mantém a exclusão de despesa atrás de aprovação', () => {
    expect(approvalGatedTools(SANTA_CLARA)).toContain('deleteExpense');
  });

  it('mantém a movimentação de gado atrás de aprovação e sem execução', () => {
    expect(approvalGatedTools(SANTA_CLARA)).toEqual(
      expect.arrayContaining(['moveCattleLot', 'createCattleLot']),
    );
    expect(executableTools(SANTA_CLARA)).not.toContain('moveCattleLot');
    expect(cattleWriteAttempts()).toEqual([]);
  });

  it('nenhuma tool de gado aceita identificador de fazenda', () => {
    const fields = toolInputFields(SANTA_CLARA);

    expect(Object.keys(fields)).toEqual(expect.arrayContaining(CATTLE_TOOLS));
    expect(
      CATTLE_TOOLS.flatMap((name) =>
        fields[name]
          .filter((field) => /farm|fazenda/i.test(field))
          .map((field) => `${name}.${field}`),
      ),
    ).toEqual([]);
  });
});
