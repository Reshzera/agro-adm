# 14 — Pipeline de eval do agente

**Depende de:** 07

Suite de avaliação do loop do agente contra o modelo real. **Separada de `yarn test`** porque consome tokens e é não-determinística — não pode compartilhar pipeline com testes que precisam ser verdes sempre.

**Comando:** `yarn eval` (config própria, ex. `vitest.eval.config.ts`, arquivos `*.eval.ts`)

## Trigger no CI

- `workflow_dispatch` (manual)
- `push` que toque o diretório do agente (system prompt e definições de tool)
- **Não** roda em todo push — custo por rodada é real

## Desenho

- ~20 casos, um turno cada, entrada em português natural do produtor
- Asserção sobre **qual tool foi chamada e com quais argumentos**, não sobre o texto da resposta
- Relógio congelado (data fixa injetada no prompt) — senão asserções sobre `date` quebram sozinhas
- Banco com seed fixo: Fazenda Santa Clara, IDs previsíveis
- **Limiar em vez de tudo-ou-nada**: falha abaixo de ~90% de acerto, imprime os casos que regrediram. Um caso vermelho isolado é ruído; três que passavam e pararam é regressão.
- Sem LLM-as-judge no MVP (dobra custo, adiciona flakiness). Possível exceção: verificar que o card de confirmação nomeia lote e destino corretos antes de uma ação de nível 3.

## Casos mínimos

- Registro de despesa por linguagem natural, com e sem área ("gastei 4.800 de diesel hoje" / "gastei 18 mil reformando o pasto 4")
- Rateio entre duas áreas ("metade no Talhão 1 e metade no Talhão 2")
- Consulta financeira com recorte de período e de categoria
- Movimentação de lote → deve gerar `PendingAction`, **nunca executar direto**
- Onboarding: fazenda incompleta → o agente pergunta em vez de inventar
- Consulta por área ("quantos animais no Pasto 4")
- Pergunta ambígua → o agente pede esclarecimento em vez de chutar

## Ferramenta

`vitest` com config separada resolve, zero dependência nova, reaproveitando o harness de seed do ticket 03. Se depois quiser histórico e UI, o `evalite` é vitest-based e os casos migram sem reescrita.
