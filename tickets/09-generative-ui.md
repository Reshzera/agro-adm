# 09 — Generative UI: catálogo de componentes no front

**Depende de:** 08 · **Requisitos:** RF-12, RF-13

## Abordagem híbrida

- **Tool de dados → componente por convenção no front.** O `part.type` da tool no `UIMessage` determina qual componente renderiza. O modelo escolhe *ferramenta*, não componente — **não existe tool que receba nome de componente como argumento**, o que elimina a classe de bug "modelo inventou props".
- **Tools de UI pura** só para o que não é consequência de uma consulta: formulário manual e card de confirmação. ("Quero cadastrar meus pastos" não é consulta de dados — mas o editor e o `FarmMap` em si são do ticket 16.)

Isso difere do RF-13 original, que propunha uma tool `render_ui` genérica com nome de componente e props. A troca é deliberada: menos expressividade, muito menos superfície de erro.

## Componentes desta fatia

`FinancialSummary`, `ExpenseChart`, `RevenueChart`, `ExpenseTable`, `ConfirmationCard`, `ManualForm`.

`FarmMap` e `AreaDetails` entram pelo ticket 16, no mesmo mapeamento `part.type` → componente.

## Implementação

- Mapeamento `part.type` → componente num único lugar
- Part desconhecida degrada para texto, nunca quebra a tela
- Props tipadas a partir do output da tool correspondente
- **Tool results congelados:** reabrir a conversa de setembro re-renderiza o gráfico com os dados de setembro, sem reexecução
