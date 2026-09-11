# agro-adm

Monorepo simples, sem workspaces:

- `backend/` — NestJS com adaptador Express
- `frontend/` — React SPA (Vite)

Cada projeto tem seu `package.json` e seu lockfile. Os scripts da raiz só delegam.

## Rodando local

```sh
cp .env.example .env
docker compose up -d          # Postgres 16
yarn install:all              # deps de backend/ e frontend/
yarn install                  # deps da raiz (só concurrently)
yarn db:migrate               # aplica as migrations
yarn db:seed                  # Fazenda Santa Clara
yarn dev                      # backend em :3000, frontend em :5173
```

`GET http://localhost:3000/health` responde `{ "status": "ok", "service": "backend" }`;
o frontend consulta esse endpoint na home para mostrar se o backend está no ar.

## Scripts da raiz

| script | o que faz |
| --- | --- |
| `yarn dev` | sobe backend e frontend juntos |
| `yarn build` | compila os dois |
| `yarn test` | suíte do backend |
| `yarn eval` | suíte de avaliação do agente contra o modelo real — gasta token |
| `yarn db:up` / `db:down` / `db:logs` | Postgres do compose |
| `yarn db:migrate` | `prisma migrate dev` |
| `yarn db:seed` | reseta e reaplica a fixture Fazenda Santa Clara |
| `yarn db:reset` | dropa, remigra e resemeia |
| `yarn db:studio` | Prisma Studio |

## Eval do agente

`yarn eval` é uma pipeline separada de `yarn test` de propósito: ela chama o
modelo real, gasta token e é não-determinística, então não pode dividir pipeline
com testes que precisam ser verdes sempre. Os casos vivem em `backend/eval/` e
rodam com config própria (`backend/jest.eval.config.ts`, arquivos `*.eval.ts`).

Cada caso é um turno só, escrito em português de produtor, e a asserção é sobre
**qual tool o modelo chamou e com quais argumentos** — nunca sobre o texto da
resposta. O relógio é o `SEED_CLOCK` e o mundo é a Fazenda Santa Clara, os
mesmos do `yarn test`; os casos que dependem de confirmação (guardrail nível 2)
trazem os turnos anteriores prontos no histórico.

A suíte falha abaixo de 90% de acerto (`EVAL_THRESHOLD`), e não por caso
isolado: um vermelho é ruído, três que passavam e pararam é regressão
(`EVAL_MAX_REGRESSIONS`). A referência do que passava fica em
`backend/eval/baseline.json` — regrave com `yarn --cwd backend eval:baseline`
depois de conferir o relatório. No CI a suíte só roda em `workflow_dispatch` ou
quando um merge na `main` toca o system prompt, as definições de tool ou os
próprios casos — branch de feature não gasta token sozinha.

## Dados

O schema vive em `backend/prisma/schema.prisma`. As decisões de modelagem estão
no ticket 02 (`tickets/02-schema-prisma.md`), não em comentário no arquivo. As
três que mais mordem: toda `Expense` tem ao menos uma `ExpenseAllocation` e
`SUM(allocations.amount) = expense.amount` (allocation "geral" tem `areaId`
nulo); `FarmArea.shape` é polígono em coordenadas 0..1 relativas à imagem do
mapa, com `space` gravado junto; `FarmArea.hectares` é digitado pelo produtor e
**não** tem invariante com `Farm.totalAreaHa`.

**A fixture é a Fazenda Santa Clara**, em `backend/src/seed/santa-clara.ts`. Ela não
é dado de vitrine: é o mundo contra o qual os testes e os evals de todas as
fatias rodam. IDs são literais legíveis (`seed-area-talhao-1`) e as datas saem
de um relógio congelado (`SEED_CLOCK`, 16/03/2026) — asserção sobre "esse mês"
não pode depender de quando a suíte roda. Há uma segunda fazenda no seed só
para que o teste de isolamento por `farmId` tenha contra quem falhar.

## Coisas que vão morder

**`bodyParser: false` no `NestFactory.create()`.** É exigência do BetterAuth
(ticket 04) e do webhook do WhatsApp, que precisa do corpo bruto. Enquanto o
ticket 04 não registrar `express.json()` para tudo que não for o prefixo do
BetterAuth, **nenhuma rota parseia JSON** — só GET se comporta como esperado.
Não vale criar POST antes disso.

**Porta do Postgres.** A 5432 do host costuma estar ocupada por outro Postgres
local, então o padrão aqui é `5433` no host e 5432 dentro do container. Trocar
via `POSTGRES_PORT` no `.env` (e refletir em `DATABASE_URL`).

**Um `.env` só, na raiz.** O Vite lê dele via `envDir: '..'` e expõe ao cliente
apenas o que tem prefixo `VITE_`. O backend lê pelo `ConfigModule`.

**`HOST_URL` nasce sem uso.** É o ngrok do webhook do WhatsApp, na fatia seguinte.

**A `DATABASE_URL` não fica no `schema.prisma`.** O Prisma 7 removeu o `url` do
bloco `datasource`: a URL vive em `backend/prisma.config.ts` (que carrega o
`.env` da raiz) para os comandos de migration, e o `PrismaClient` recebe um
adapter `@prisma/adapter-pg` construído com ela. Quem instanciar `PrismaClient`
sem adapter toma erro em runtime — use o `PrismaService`.

**As colunas `jsonb` ainda não têm validação.** `Message.parts`,
`PendingAction.args` e `FarmArea.shape` chegam como `JsonValue` do Prisma. A
validação entra com class-validator junto dos DTOs, nas fatias que escrevem
essas colunas — até lá, `shape` aceita ponto fora de 0..1 sem reclamar.

**Jest com `watchman: false`.** O watchman instalado nesta máquina está quebrado
(`libfmt` faltando) e fazia o jest sair sem rodar teste nenhum. Se o watchman
for consertado, dá para remover a flag dos dois configs.
