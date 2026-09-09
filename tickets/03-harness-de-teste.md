# 03 — Harness de teste: seam HTTP com provider de modelo injetável

**Depende de:** 02

A infraestrutura de teste da qual todos os tickets seguintes dependem. **Vale fazer cedo** — sem isso, os tickets de agente só são verificáveis gastando token, e na prática viram teste manual ou teste adiado.

## A seam única do projeto

Requisição HTTP contra a app Nest inicializada, com Postgres real.

- Boot da app Nest em teste, apontando para um Postgres real (container do compose ou testcontainers)
- Reset + seed entre testes, a partir da fixture Fazenda Santa Clara do ticket 02
- **Provider do modelo injetado, não importado direto** — é isso que permite trocar o backend
- Em `yarn test`: `MockLanguageModelV2` do `ai/test`, roteirizável para emitir tool calls específicas
- Helper para autenticar uma requisição como um usuário do seed
- Relógio congelado (data fixa) — necessário para asserções sobre "hoje"

## O que não fazer

Mockar Prisma. Testar service por service. Assertar sobre o texto gerado pelo modelo.

## Nota

Não há prior art — este é o primeiro código do repositório, e esta suíte é o precedente que as próximas fatias seguem.
