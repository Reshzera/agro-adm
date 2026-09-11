import { moveCattleLotAgentInputSchema } from '../../../cattle/commands/move-cattle-lot.command';

/**
 * Ticket 10 will add preview, approval and execution. Defining the registry
 * from the command schema now makes schema drift impossible in that slice.
 */
export const moveCattleLotRegistry = {
  description: 'Move um lote de gado entre dois pastos.',
  inputSchema: moveCattleLotAgentInputSchema,
  needsApproval: true,
};
