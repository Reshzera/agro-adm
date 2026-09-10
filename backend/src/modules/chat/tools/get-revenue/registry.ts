import { periodSchema } from '../utils';

export const getRevenueRegistry = {
  description: 'Lista receitas da fazenda, com filtro opcional de período.',
  inputSchema: periodSchema,
};
