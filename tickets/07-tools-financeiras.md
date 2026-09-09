# 07 — Tools financeiras do agente

**Depende de:** 05, 06 · **Requisitos:** RF-15 a RF-19

Onde a conversa vira dado.

**Tools:** `getFarm`, `updateFarm`, `updateFarmContext`, `createExpense`, `createRevenue`, `updateExpense`, `updateRevenue`, `getExpenses`, `getRevenue`, `getFinancialSummary`.

## Regra inegociável

As tools recebem `farmId` do contexto autenticado. **Nenhuma tool aceita `farmId` no schema Zod.** O modelo nunca vê nem escolhe de qual fazenda está falando.

## Implementação

- Schemas Zod por tool; as tools só chamam o domínio do ticket 05, não reimplementam agregação
- Datas relativas ("hoje", "ontem", "semana passada") resolvidas contra a data corrente do prompt
- Categoria classificada pelo agente a partir do enum; `description` guarda as palavras do produtor
- Guardrail nível 2: criação apresenta o entendimento antes de gravar
- `source: WEB_AGENT` em tudo que vem por aqui

## `updateFarmContext`

**Reescreve o markdown inteiro**, com a versão anterior no input. Nunca append — senão em três meses vira um arquivo de 400 linhas com contradições que ninguém limpa.

Só informação qualitativa. Qualquer número que participe de cálculo é dado estruturado, não texto de contexto.

## Cobertura de teste (mock roteirizado emitindo a tool call)

`createExpense` grava com allocation correta · data relativa resolve certo com relógio congelado · não existe tool com `farmId` no argumento · `updateFarmContext` substitui, não concatena.
