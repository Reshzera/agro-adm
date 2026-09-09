# 12 — Tela `/app/financeiro`: lançamentos manuais

**Depende de:** 05 · **Requisitos:** RF-18, RF-19, RF-29 a RF-32

O caminho para quem está no computador e já sabe o que quer.

- Tabela de lançamentos: data, descrição, categoria, área, valor
- Filtros: período, tipo (receita/despesa), categoria
- Criar lançamento por formulário (`source: MANUAL`)
- Editar lançamento
- Resumo de receitas, despesas e resultado no topo

## Exclusão aqui NÃO usa PendingAction

Confirmação direta na UI. O mecanismo do ticket 08 existe porque a intenção passou por **interpretação de linguagem natural** — "apaga aquele lançamento do diesel" pode ser o lançamento errado. Um clique em "excluir" numa linha específica da tabela é intenção inequívoca; forçar `PendingAction` ali seria cerimônia sem ganho.

Consome o domínio do ticket 05 — sem lógica financeira duplicada aqui.
