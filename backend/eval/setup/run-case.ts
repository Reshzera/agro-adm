import {
  generateText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
  type Tool,
  type ToolSet,
} from 'ai';
import type { FarmAgentContext } from '../../src/modules/chat/chat.repository';
import { systemPrompt } from '../../src/modules/chat/chat.service';
import { chatTools } from '../../src/modules/chat/tools';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type { CaseResult, EvalCase, RecordedCall } from './case';
import { evalFarmService, evalFinancialService } from './world';

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? '4');
const MAX_STEPS = Number(process.env.EVAL_MAX_STEPS ?? '4');

const READ_ONLY_TOOLS = [
  'getFarm',
  'getExpenses',
  'getRevenue',
  'getFinancialSummary',
];

function productionTools(farm: FarmAgentContext): Record<string, Tool> {
  return chatTools(
    SEED_IDS.farms.santaClara,
    SEED_CLOCK,
    evalFinancialService(),
    evalFarmService(farm),
  );
}

function turnTools(farm: FarmAgentContext): ToolSet {
  return Object.fromEntries(
    Object.entries(productionTools(farm)).map(([name, definition]) => [
      name,
      {
        description: definition.description,
        inputSchema: definition.inputSchema,
        ...(READ_ONLY_TOOLS.includes(name)
          ? { execute: definition.execute }
          : {}),
      },
    ]),
  );
}

export function approvalGatedTools(farm: FarmAgentContext): string[] {
  return Object.entries(productionTools(farm))
    .filter(([, definition]) => definition.needsApproval)
    .map(([name]) => name);
}

async function runCase(
  model: LanguageModel,
  evalCase: EvalCase,
): Promise<CaseResult> {
  const started = Date.now();
  const messages: ModelMessage[] = [
    ...(evalCase.history ?? []),
    { role: 'user', content: evalCase.prompt },
  ];

  try {
    const result = await generateText({
      model,
      system: systemPrompt(evalCase.farm, SEED_CLOCK),
      messages,
      tools: turnTools(evalCase.farm),
      stopWhen: stepCountIs(MAX_STEPS),
      maxRetries: 2,
    });

    const calls: RecordedCall[] = result.steps.flatMap((step) =>
      step.toolCalls.map((call) => ({
        toolName: call.toolName,
        input: (call.input ?? {}) as Record<string, unknown>,
      })),
    );

    return {
      id: evalCase.id,
      title: evalCase.title,
      calls,
      text: result.text.trim(),
      ms: Date.now() - started,
      ...evalCase.grade(calls),
    };
  } catch (error) {
    return {
      id: evalCase.id,
      title: evalCase.title,
      calls: [],
      text: '',
      ms: Date.now() - started,
      ok: false,
      detail: `erro na chamada: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runCases(
  model: LanguageModel,
  cases: EvalCase[],
): Promise<CaseResult[]> {
  const results = new Array<CaseResult>(cases.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(CONCURRENCY, cases.length)) },
    async () => {
      while (cursor < cases.length) {
        const index = cursor++;
        results[index] = await runCase(model, cases[index]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
