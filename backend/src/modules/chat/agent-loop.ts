import { stepCountIs, type StopCondition, type ToolSet } from 'ai';

export const AGENT_MAX_STEPS = 8;

export function agentStopWhen<TOOLS extends ToolSet>(): StopCondition<TOOLS> {
  return stepCountIs(AGENT_MAX_STEPS);
}
