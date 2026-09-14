import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  type Tool,
  type ToolSet,
} from 'ai';
import { z } from 'zod';
import { agentStopWhen } from '../../src/modules/chat/agent-loop';
import type { FarmAgentContext } from '../../src/modules/chat/chat.repository';
import { systemPrompt } from '../../src/modules/chat/chat.service';
import { chatTools } from '../../src/modules/chat/tools';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type { CaseResult, EvalCase, RecordedCall } from './case';
import {
  evalAttentionService,
  evalCattleService,
  evalFarmService,
  evalFinancialService,
} from './world';

const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? '4');

const READ_ONLY_TOOLS = [
  'getFarm',
  'getExpenses',
  'getRevenue',
  'getFinancialSummary',
  'getCattleOverview',
  'getAttentionItems',
  'explainAttentionItem',
];

function productionTools(farm: FarmAgentContext): Record<string, Tool> {
  return chatTools({
    farmId: SEED_IDS.farms.santaClara,
    actorId: SEED_IDS.users.joao,
    now: SEED_CLOCK,
    financial: evalFinancialService(),
    farms: evalFarmService(farm),
    cattle: evalCattleService(),
    attention: evalAttentionService(),
  });
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

export function executableTools(farm: FarmAgentContext): string[] {
  return Object.entries(turnTools(farm))
    .filter(([, definition]) => typeof definition.execute === 'function')
    .map(([name]) => name);
}

function inputFields(schema: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(
      node as Record<string, unknown>,
    )) {
      if (key === 'properties' && value !== null && typeof value === 'object') {
        found.push(...Object.keys(value));
      }
      walk(value);
    }
  };
  walk(z.toJSONSchema(schema as z.ZodType, { io: 'input' }));
  return found;
}

export function toolInputFields(
  farm: FarmAgentContext,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(productionTools(farm)).map(([name, definition]) => [
      name,
      inputFields(definition.inputSchema),
    ]),
  );
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
      stopWhen: agentStopWhen(),
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
