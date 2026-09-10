import { periodSchema } from '../utils';

export const getFinancialSummaryRegistry = {
  description:
    'Calcula total de receitas, despesas, resultado e despesas por categoria.',
  inputSchema: periodSchema,
};
