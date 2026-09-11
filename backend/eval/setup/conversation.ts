import type { JSONValue, ModelMessage } from 'ai';

export function producer(text: string): ModelMessage {
  return { role: 'user', content: text };
}

export function agent(text: string): ModelMessage {
  return { role: 'assistant', content: text };
}

export function agentUsed(
  toolName: string,
  input: unknown,
  output: JSONValue,
): ModelMessage[] {
  const toolCallId = `eval-${toolName}`;
  return [
    {
      role: 'assistant',
      content: [{ type: 'tool-call', toolCallId, toolName, input }],
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId,
          toolName,
          output: { type: 'json', value: output },
        },
      ],
    },
  ];
}
