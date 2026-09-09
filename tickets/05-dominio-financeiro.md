# 05 — Domínio financeiro: allocations, invariante e agregações

**Depende de:** 03

A camada determinística de dinheiro. Sem agente, sem UI — é o que todas as outras peças consomem.

## A invariante central

`SUM(allocations.amount) = expense.amount`, imposta na escrita, não por convenção.

- Toda `Expense` nasce com ao menos uma `ExpenseAllocation`. Despesa sem área tem uma allocation com `areaId: null`.
- `areaId` é FK real para `FarmArea` desde o ticket 02. Nesta fatia nada popula áreas fora do seed, mas o domínio já aceita e agrega por área — não há retrabalho quando o ticket 16 entrar.
- **Toda soma financeira do sistema lê de allocations**, nunca de `Expense.amount` direto. É isso que garante que "total da fazenda" e "total por área" não possam divergir.
- Escrever allocations é **substituir o conjunto inteiro** daquela despesa, não adicionar uma — é o que torna "na verdade foi metade em cada" fácil de acertar.

## Operações

Criar/editar/excluir despesa e receita · `getFinancialSummary` (receitas, despesas, resultado por período) · listagem com filtro de período, tipo e categoria · agregação por categoria.

## Consulta por termo

"Quanto gastei com diesel" filtra por enum de categoria **e** busca no `description` livre. Os dois juntos: o enum sozinho agrega mas não acha, o texto sozinho acha mas não agrega.

Todo lançamento grava `source`.

## Cobertura de teste

Despesa sem área gera allocation nula somando o total · rateio 50/50 soma o total · allocation que não fecha é rejeitada · agregado por categoria bate com a lista · filtro de período não pega borda errada.
