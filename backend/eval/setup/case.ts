import type { ModelMessage } from 'ai';
import type { FarmAgentContext } from '../../src/modules/chat/chat.repository';

export type RecordedCall = {
  toolName: string;
  input: Record<string, unknown>;
};

export type Grade = {
  ok: boolean;
  detail: string;
};

export type Grader = (calls: RecordedCall[]) => Grade;

export type EvalCase = {
  id: string;
  title: string;
  farm: FarmAgentContext;
  history?: ModelMessage[];
  prompt: string;
  grade: Grader;
};

export type CaseResult = Grade & {
  id: string;
  title: string;
  calls: RecordedCall[];
  text: string;
  ms: number;
};
