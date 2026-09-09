# Tickets — MVP agro-adm

Cada arquivo é um ticket independente. Numeração segue ordem de dependência.

Contexto de origem: `../mvp-func-req.md` (requisitos) e `../specs/001-nucleo-conversacional-financeiro.md` (spec da fatia 1).

## Grafo de dependência

```
01 bootstrap
 └─ 02 schema prisma
     └─ 03 harness de teste
         ├─ 04 auth ──────────────┐
         └─ 05 domínio financeiro │
                    │             │
                    │        06 loop do agente
                    │             ├─ 10 múltiplos chats
                    └──────┬──────┘
                           │
                      07 tools financeiras
                           ├─ 08 pending action ── 09 generative ui ── 16 áreas e mapa
                           ├─ 11 onboarding ────── 13 páginas públicas + config
                           └─ 14 eval
                    05 ──── 12 tela financeiro

15 ci/cd — backlog, bloqueado por registro de domínio
```

Caminho crítico: `01 → 02 → 03 → 04 → 06 → 07`. Depois do 07 abre em várias frentes paralelas.

O 16 está escrito por inteiro mas é **fatia seguinte** — só as tabelas dele entram agora, no 02.

## Decisões fechadas que atravessam todos os tickets

- Monorepo simples: `api/` (NestJS, adaptador Express) + `web/` (React SPA), sem workspaces
- Postgres puro — **PostGIS e qualquer consulta espacial estão fora do MVP inteiro**
- **O mapa da fazenda é uma imagem que o produtor sobe**, não um mapa georreferenciado. Polígonos gravados em coordenadas relativas à imagem (`0..1`), nunca lat/lng. Sem GeoJSON, sem GPS.
- **`FarmArea.hectares` é digitado pelo produtor**, não derivado da geometria — sem coordenada real não há cálculo de área, e o produto não calibra escala. `Farm.totalAreaHa` e a soma dos hectares das áreas podem divergir sem que isso seja erro.
- Prisma como ORM; colunas `jsonb` com estrutura são tipadas por Zod e validadas na fronteira do repositório
- Vercel AI SDK no servidor, `useChat` no cliente, modelo `gpt-5`, provider **injetado** (não importado direto)
- Tools recebem `farmId` do contexto autenticado — **nenhuma tool aceita `farmId` no schema**
- `Farm` criada vazia no signup: `farmId` nunca é nulo em lugar nenhum
- Toda soma financeira lê de `ExpenseAllocation`, nunca de `Expense.amount` direto
- Ações destrutivas só executam via `PendingAction` — guardrail estrutural, não convencional
- Seam única de teste: requisição HTTP contra a app Nest inicializada, com Postgres real

## Fatias seguintes

- **WhatsApp** _(sem ticket)_ — webhook, identificação por número, texto/áudio/imagem, botões de confirmação, OTP entregue no próprio WhatsApp
- **Áreas e mapa** — ticket 16, já escrito: upload da imagem, desenho de polígono sobre ela, tools de área, `FarmMap` no catálogo de generative UI
- **Pecuária** _(sem ticket)_ — lotes, movimentação, histórico
- **Agricultura** _(sem ticket)_ — cultura por área, produção em sacas
- **Cotações** _(sem ticket)_ — provider abstraído, cron, histórico de preços
