import { moveCattleLotAgentInputSchema } from '../../../cattle/commands/move-cattle-lot.command';

/**
 * Defining the registry from the command schema makes drift between what the
 * model may ask for and what the command accepts impossible.
 */
export const moveCattleLotRegistry = {
  description:
    'Move um lote de gado do pasto onde ele está para outro pasto, depois da confirmação explícita do produtor. Use os identificadores devolvidos por getCattleOverview; fromPaddockId precisa ser o pasto atual do lote.',
  inputSchema: moveCattleLotAgentInputSchema,
  needsApproval: true,
};
