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
| `yarn test` | suíte do backend (precisa do Postgres de pé) |
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

Um turno pode ter vários passos: o servidor roda o loop até o limite de
`AGENT_MAX_STEPS` (`backend/src/modules/chat/agent-loop.ts`), e o eval importa o
mesmo `agentStopWhen` — se o limite mudar, muda para os dois. O navegador só
reenvia a conversa quando quem responde é o produtor: aprovação de exclusão ou
formulário manual. Tool sem `execute` (aprovação pendente, formulário) encerra o
passo; é assim que o loop para e espera a pessoa.

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

**Gado e pasto: só intervalos, sem ponteiro.** Um lote (`CattleLot`) ocupa um
pasto através de `PaddockOccupancy`, que é intervalo (`startedAt`, `endedAt`
nulo enquanto aberto). Não existe `currentPaddockId` no lote de propósito: duas
fontes de verdade divergem, o intervalo mais o índice parcial
`paddock_occupancy_open_lot_key` (`UNIQUE ("lotId") WHERE "endedAt" IS NULL`)
não. O mesmo vale para `farm_attention_item_open_rule_scope_key`
(`UNIQUE ("farmId","ruleId","scopeId") WHERE status IN ('NEW','SEEN')`), que
impede o mesmo alerta empilhar duas vezes para o mesmo escopo. Os dois índices
são parciais — daí `previewFeatures = ["partialIndexes"]` no gerador — e
`backend/test/database/schema-invariants.spec.ts` prova a recusa no banco real,
por isso essa spec (só ela) precisa do Postgres de pé.

**Animal individual existe e não é usado.** `CattleAnimal` está no schema porque
o produtor que controla animal a animal vai precisar, mas lote com `headCount` e
zero animais é o caminho normal e tem que funcionar inteiro assim.

**Configuração de pasto em branco significa herdar.** `FarmArea` ganhou
`usableAreaHa`, `maxGrazingDays`, `minRestDays`, `plannedCapacityHead` e
`forageType`; nulo quer dizer "usa o padrão da fazenda"
(`Farm.defaultMaxGrazingDays`, `defaultMinRestDays`,
`defaultStockingRateHeadPerHa`), e o padrão do sistema entra só se a fazenda
também estiver em branco. Quem grava avaliação de regra tem que gravar junto o
valor resolvido e de onde ele veio — mudar o limite depois não pode reescrever a
explicação de ontem.

**Trilha de evento nasce vazia.** `domain_event`, `outbox_message`,
`rule_evaluation`, `farm_attention_item` e `idempotency_key` existem desde a
migration `20260911164247_cattle_paddock_and_event_schema` e ninguém escreve
nelas ainda — os tickets 07 a 09 escrevem. O evento separa quando aconteceu
(`occurredAt`, que aceita lançamento retroativo) de quando foi registrado
(`recordedAt`), e carrega `correlationId`/`causationId` mais `actorType`
(`USER`, `AGENT`, `SYSTEM`, `INTEGRATION`) — é o que liga movimento, regra e
alerta numa operação só.

**A fixture é a Fazenda Santa Clara**, em `backend/src/seed/santa-clara.ts`. Ela não
é dado de vitrine: é o mundo contra o qual os testes e os evals de todas as
fatias rodam. IDs são literais legíveis (`seed-area-talhao-1`) e as datas saem
de um relógio congelado (`SEED_CLOCK`, 16/03/2026) — asserção sobre "esse mês"
não pode depender de quando a suíte roda. Há uma segunda fazenda no seed só
para que o teste de isolamento por `farmId` tenha contra quem falhar.

A fixture tem gado: Lote 12 (180 cabeças) no Pasto 4 desde 04/03, Lote 8 (96) no
Pasto 5 desde 12/03 e Lote 3 (240) sem pasto nenhum. O Lote 12 está lá há 12
dias contra os 10 configurados no Pasto 4 — é o caso que a regra de rotação do
ticket 08 precisa achar. O Pasto 6 guarda uma ocupação já fechada, para existir
descanso medível. Os fakes em memória
(`backend/test/test-setups/mock-repositories.ts`) repetem esse mundo e recusam
segunda ocupação aberta do mesmo jeito que o índice recusa.

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

**Repositório não guarda conexão.** Todo repositório injeta o `DatabaseService`
(`backend/src/modules/database/database.service.ts`) e pega o client por
chamada, em `this.db.client`. Fora de transação isso é o próprio
`PrismaService`; dentro de `db.transaction(...)` é o client da transação aberta,
propagado por `AsyncLocalStorage`. É assim que uma operação de negócio escreve
em vários repositórios e volta atrás junto — o que o movimento de gado do
ticket 07 exige. `db.transaction` aninhado entra na transação de fora em vez de
abrir outra. O `AuthRepository` fica de fora: ele usa o `PrismaClient` próprio
do BetterAuth, em outra conexão.

**Nem toda coluna `jsonb` tem validação.** `Message.parts` já passa por
`validateUIMessages` na leitura do `ChatService`: o repositório devolve
`JsonValue` e quem transforma em `UIMessage` é o validador, não um cast. Já
`PendingAction.args` e `FarmArea.shape` continuam chegando como `JsonValue` crua
— a validação entra com class-validator junto dos DTOs, nas fatias que escrevem
essas colunas, e até lá `shape` aceita ponto fora de 0..1 sem reclamar.

**Jest com `watchman: false`.** O watchman instalado nesta máquina está quebrado
(`libfmt` faltando) e fazia o jest sair sem rodar teste nenhum. Se o watchman
for consertado, dá para remover a flag dos dois configs.
