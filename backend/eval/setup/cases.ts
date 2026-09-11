import type { JSONValue } from 'ai';
import type { EvalCase } from './case';
import { agent, agentUsed, producer } from './conversation';
import { FAZENDA_EM_ONBOARDING, FAZENDA_VAZIA, SANTA_CLARA } from './fixtures';
import { EXPENSES } from './world';
import {
  allocations,
  anyOf,
  all,
  calls,
  date,
  equals,
  matches,
  money,
  month,
  noWrite,
  spans,
  wholeFarm,
} from './graders';
import { serialize } from '../../src/modules/chat/tools/utils';
import { SEED_IDS } from '../../src/seed/santa-clara';

const despesasDeMarco = [
  producer('me mostra as despesas de março'),
  ...agentUsed(
    'getExpenses',
    { from: '2026-03-01', to: '2026-03-31' },
    serialize(
      EXPENSES.filter((expense) => expense.date >= new Date('2026-03-01')),
    ) as JSONValue,
  ),
  agent(
    'Em março: adubo R$ 24.000,00 em 02/03, reforma do pasto 4 R$ 18.000,00 em 04/03 e diesel do trator R$ 4.800,00 em 10/03.',
  ),
];

export const cases: EvalCase[] = [
  {
    id: 'despesa-diesel-hoje',
    title: 'despesa por linguagem natural, sem área',
    farm: SANTA_CLARA,
    history: [
      producer('gastei 4.800 de diesel hoje'),
      agent(
        'Entendi: despesa de R$ 4.800,00 em Combustível, hoje (16/03/2026), sem rateio por área. Confirma?',
      ),
    ],
    prompt: 'isso mesmo, pode lançar',
    grade: calls(
      'createExpense',
      money('amount', '4800.00'),
      date('date', '2026-03-16'),
      equals('category', 'FUEL'),
      wholeFarm(),
    ),
  },
  {
    id: 'despesa-reforma-pasto-4',
    title: 'despesa por linguagem natural, com área',
    farm: SANTA_CLARA,
    history: [
      producer('gastei 18 mil reformando o pasto 4'),
      agent(
        'Entendi: despesa de R$ 18.000,00 em Manejo de pasto e lavoura, hoje (16/03/2026), toda no Pasto 4. Confirma?',
      ),
    ],
    prompt: 'confirma',
    grade: calls(
      'createExpense',
      money('amount', '18000.00'),
      equals('category', 'PASTURE_AND_CROP_WORK'),
      allocations([{ areaId: SEED_IDS.areas.pasto4, amount: '18000.00' }]),
    ),
  },
  {
    id: 'despesa-rateada-dois-talhoes',
    title: 'rateio entre duas áreas',
    farm: SANTA_CLARA,
    history: [
      producer(
        'comprei 24 mil de adubo, metade no talhão 1 e metade no talhão 2',
      ),
      agent(
        'Entendi: despesa de R$ 24.000,00 em Fertilizante e semente, hoje (16/03/2026), com R$ 12.000,00 no Talhão 1 e R$ 12.000,00 no Talhão 2. Confirma?',
      ),
    ],
    prompt: 'pode lançar',
    grade: calls(
      'createExpense',
      money('amount', '24000.00'),
      equals('category', 'FERTILIZER_AND_SEED'),
      allocations([
        { areaId: SEED_IDS.areas.talhao1, amount: '12000.00' },
        { areaId: SEED_IDS.areas.talhao2, amount: '12000.00' },
      ]),
    ),
  },
  {
    id: 'despesa-semana-passada',
    title: 'data relativa contra o relógio congelado',
    farm: SANTA_CLARA,
    history: [
      producer('paguei 3.150 de vacina semana passada'),
      agent(
        'Entendi: despesa de R$ 3.150,00 em Sanidade animal, em 09/03/2026, sem rateio por área. Confirma?',
      ),
    ],
    prompt: 'isso',
    grade: calls(
      'createExpense',
      money('amount', '3150.00'),
      date('date', '2026-03-09'),
      equals('category', 'ANIMAL_HEALTH'),
    ),
  },
  {
    id: 'receita-boi-gordo',
    title: 'receita com data relativa',
    farm: SANTA_CLARA,
    history: [
      producer('vendi 24 bois gordos ontem por 86.400'),
      agent(
        'Entendi: receita de R$ 86.400,00 em 15/03/2026, venda de 24 bois gordos. Confirma?',
      ),
    ],
    prompt: 'confirmado',
    grade: calls(
      'createRevenue',
      money('amount', '86400.00'),
      date('date', '2026-03-15'),
    ),
  },
  {
    id: 'guardrail-confirma-antes-de-criar',
    title: 'não grava despesa antes de apresentar o entendimento',
    farm: SANTA_CLARA,
    prompt: 'gastei 4.800 de diesel hoje',
    grade: noWrite(),
  },
  {
    id: 'resumo-do-mes',
    title: 'consulta financeira com recorte de período',
    farm: SANTA_CLARA,
    prompt: 'quanto sobrou esse mês?',
    grade: calls('getFinancialSummary', month('2026-03')),
  },
  {
    id: 'despesas-por-categoria',
    title: 'consulta com recorte de período e de categoria',
    farm: SANTA_CLARA,
    prompt: 'quanto eu gastei com combustível em março?',
    grade: anyOf(
      {
        tool: 'getExpenses',
        check: all(equals('category', 'FUEL'), month('2026-03')),
      },
      { tool: 'getFinancialSummary', check: month('2026-03') },
    ),
  },
  {
    id: 'receitas-de-fevereiro',
    title: 'consulta de receitas por período',
    farm: SANTA_CLARA,
    prompt: 'quanto entrou em fevereiro?',
    grade: anyOf(
      { tool: 'getRevenue', check: month('2026-02') },
      { tool: 'getFinancialSummary', check: month('2026-02') },
    ),
  },
  {
    id: 'despesas-por-termo',
    title: 'consulta por texto do produtor',
    farm: SANTA_CLARA,
    prompt: 'me mostra os gastos com vacina neste ano',
    grade: anyOf(
      { tool: 'getExpenses', check: matches('term', /vacin/i) },
      { tool: 'getExpenses', check: equals('category', 'ANIMAL_HEALTH') },
    ),
  },
  {
    id: 'gasto-por-area',
    title: 'consulta por área usa o filtro de área, não busca textual',
    farm: SANTA_CLARA,
    prompt: 'quanto já gastei no pasto 4 este ano?',
    grade: calls(
      'getExpenses',
      equals('areaId', SEED_IDS.areas.pasto4),
      spans('2026-02-01', '2026-03-04'),
    ),
  },
  {
    id: 'pergunta-ambigua',
    title: 'pedido ambíguo — pede esclarecimento em vez de chutar',
    farm: SANTA_CLARA,
    prompt: 'lança aquele pagamento aí',
    grade: noWrite(),
  },
  {
    id: 'valor-faltando',
    title: 'despesa sem valor — pergunta em vez de inventar',
    farm: SANTA_CLARA,
    prompt: 'paguei o veterinário ontem, pode registrar',
    grade: noWrite(),
  },
  {
    id: 'exclusao-passa-pela-tool-com-aprovacao',
    title: 'exclusão vai para a tool com aprovação, com o id certo',
    farm: SANTA_CLARA,
    history: [
      ...despesasDeMarco,
      producer('a do diesel entrou duas vezes, apaga essa'),
      agent(
        'Encontrei um lançamento de diesel em março: Diesel do trator, R$ 4.800,00, 10/03/2026, categoria Combustível. Confirma que devo excluir esse lançamento?',
      ),
    ],
    prompt: 'confirmo, pode excluir',
    grade: calls('deleteExpense', equals('id', SEED_IDS.expenses.diesel)),
  },
  {
    id: 'nao-apaga-sem-identificar',
    title: 'exclusão sem alvo identificado não vira tool call',
    farm: SANTA_CLARA,
    prompt: 'apaga aquela despesa errada',
    grade: noWrite(),
  },
  {
    id: 'corrige-valor-da-despesa',
    title: 'correção de valor usa updateExpense com o id certo',
    farm: SANTA_CLARA,
    history: [
      ...despesasDeMarco,
      producer('na verdade o diesel foi 5.200, não 4.800'),
      agent(
        'Quer que eu atualize a despesa Diesel do trator, de 10/03/2026, para R$ 5.200,00, mantendo a descrição e o rateio como estavam?',
      ),
    ],
    prompt: 'isso, pode atualizar só o valor',
    grade: calls(
      'updateExpense',
      equals('id', SEED_IDS.expenses.diesel),
      money('amount', '5200.00'),
    ),
  },
  {
    id: 'formulario-manual',
    title: 'produtor pede para digitar manualmente',
    farm: SANTA_CLARA,
    prompt: 'prefiro digitar num formulário, abre aí pra eu lançar uma despesa',
    grade: calls('showManualForm', equals('kind', 'expense')),
  },
  {
    id: 'onboarding-pergunta-primeiro',
    title: 'fazenda vazia — pergunta em vez de inventar',
    farm: FAZENDA_VAZIA,
    prompt: 'oi',
    grade: noWrite(),
  },
  {
    id: 'onboarding-grava-area-total',
    title: 'onboarding grava dado estruturado assim que recebe',
    farm: FAZENDA_EM_ONBOARDING,
    history: [agent('Qual o tamanho aproximado da propriedade, em hectares?')],
    prompt: 'são 840 hectares',
    grade: calls('updateFarm', money('totalAreaHa', '840.00')),
  },
  {
    id: 'onboarding-contexto-substitui',
    title: 'contexto qualitativo é reescrito inteiro, não concatenado',
    farm: FAZENDA_EM_ONBOARDING,
    history: [agent('Me conta um pouco da rotina da propriedade.')],
    prompt: 'o rebanho é todo nelore e quem cuida do curral é o Zé',
    grade: calls(
      'updateFarmContext',
      equals('previousContext', FAZENDA_EM_ONBOARDING.agentContext),
      matches('context', /nelore/i),
      matches('context', /ant[ôo]nio/i),
    ),
  },
];
