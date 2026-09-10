import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';

export type ScriptedToolCall = {
  toolName: string;
  input: unknown;
  toolCallId?: string;
};

export type ScriptedTurn = {
  text?: string;
  toolCalls?: ScriptedToolCall[];
};

export type ScriptedModel = {
  model: LanguageModelV3;
  script(...turns: ScriptedTurn[]): void;
  readonly calls: LanguageModelV3CallOptions[];
  reset(): void;
};

const NO_USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function toolCallIdOf(
  toolCall: ScriptedToolCall,
  turnIndex: number,
  index: number,
): string {
  return toolCall.toolCallId ?? `scripted-call-${turnIndex}-${index}`;
}

function finishReasonOf(turn: ScriptedTurn): LanguageModelV3FinishReason {
  return {
    unified: turn.toolCalls?.length ? 'tool-calls' : 'stop',
    raw: undefined,
  };
}

function contentOf(
  turn: ScriptedTurn,
  turnIndex: number,
): LanguageModelV3Content[] {
  const content: LanguageModelV3Content[] = [];

  if (turn.text !== undefined) {
    content.push({ type: 'text', text: turn.text });
  }

  (turn.toolCalls ?? []).forEach((toolCall, index) => {
    content.push({
      type: 'tool-call',
      toolCallId: toolCallIdOf(toolCall, turnIndex, index),
      toolName: toolCall.toolName,
      input: JSON.stringify(toolCall.input ?? {}),
    });
  });

  return content;
}

function streamPartsOf(
  turn: ScriptedTurn,
  turnIndex: number,
): LanguageModelV3StreamPart[] {
  const parts: LanguageModelV3StreamPart[] = [
    { type: 'stream-start', warnings: [] },
  ];

  if (turn.text !== undefined) {
    const id = `scripted-text-${turnIndex}`;
    parts.push(
      { type: 'text-start', id },
      { type: 'text-delta', id, delta: turn.text },
      { type: 'text-end', id },
    );
  }

  (turn.toolCalls ?? []).forEach((toolCall, index) => {
    const id = toolCallIdOf(toolCall, turnIndex, index);
    const input = JSON.stringify(toolCall.input ?? {});
    parts.push(
      { type: 'tool-input-start', id, toolName: toolCall.toolName },
      { type: 'tool-input-delta', id, delta: input },
      { type: 'tool-input-end', id },
      {
        type: 'tool-call',
        toolCallId: id,
        toolName: toolCall.toolName,
        input,
      },
    );
  });

  parts.push({
    type: 'finish',
    finishReason: finishReasonOf(turn),
    usage: NO_USAGE,
  });

  return parts;
}

export function createScriptedModel(): ScriptedModel {
  const turns: ScriptedTurn[] = [];
  let cursor = 0;

  function nextTurn(): { turn: ScriptedTurn; index: number } {
    const turn = turns[cursor];
    if (!turn) {
      throw new Error(
        `Modelo chamado ${cursor + 1} vez(es), mas o roteiro tem ${turns.length}. Roteirize a chamada com model.script(...).`,
      );
    }
    const index = cursor;
    cursor += 1;
    return { turn, index };
  }

  const model = new MockLanguageModelV3({
    provider: 'scripted',
    modelId: 'scripted',
    doGenerate: () => {
      const { turn, index } = nextTurn();
      return Promise.resolve({
        content: contentOf(turn, index),
        finishReason: finishReasonOf(turn),
        usage: NO_USAGE,
        warnings: [],
      });
    },
    doStream: () => {
      const { turn, index } = nextTurn();
      return Promise.resolve({
        stream: convertArrayToReadableStream(streamPartsOf(turn, index)),
      });
    },
  });

  return {
    model,
    script(...next: ScriptedTurn[]): void {
      turns.push(...next);
    },
    get calls(): LanguageModelV3CallOptions[] {
      return [...model.doGenerateCalls, ...model.doStreamCalls];
    },
    reset(): void {
      turns.length = 0;
      cursor = 0;
      model.doGenerateCalls.length = 0;
      model.doStreamCalls.length = 0;
    },
  };
}
