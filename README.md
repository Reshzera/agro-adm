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

## Manejo de rebanho e pastos

A área autenticada em `/app/rebanho` permite cadastrar e editar lotes e pastos,
além de fazer a primeira colocação de um lote ainda sem histórico. A API fica
sob `/cattle/lots` e `/cattle/paddocks`; todas as operações usam a fazenda da
sessão e não aceitam IDs pertencentes a outra fazenda.

Os limites de pastejo e descanso em branco no pasto herdam os padrões da
fazenda. As respostas de pasto trazem `effectiveSettings` com o valor resolvido
e a origem (`PADDOCK`, `FARM` ou `SYSTEM`), e a tela mostra essa origem. Essa
primeira colocação só abre `PaddockOccupancy`: movimentações e eventos de
domínio começam no ticket 07.

### Movimentação pelo chat

O produtor pode pedir a movimentação em voz corrente ("passa o lote 12 pro pasto
6"). O agente resolve os nomes com `getCattleOverview`, e a tool `moveCattleLot`
só executa depois da aprovação explícita — se o nome couber em mais de um lote,
ou em nenhum, ele pergunta em vez de escolher.

Antes de confirmar, o chat mostra o que vai mudar: cabeças, pasto de origem,
pasto de destino e os avisos que as regras realmente produzem, como o destino
passar da lotação configurada. Essa prévia vem de `POST /cattle/movements/preview`,
que roda as mesmas invariantes (`assertMovementInvariants`) e os mesmos
avaliadores de `MOVEMENT_RULES` do comando, sem gravar nada — por isso a prévia e
o comando não podem discordar. Aprovar executa por `CattleService.moveLot`, o
mesmo caminho da tela manual, com `source: AGENT` e a chamada de tool aprovada
como chave de idempotência. Recusar não grava absolutamente nada.

`createCattleLot` também existe no chat e também passa por confirmação; o lote
nasce sem pasto. Desenhar ou editar o contorno de um pasto continua fora do
chat: é um ato espacial e um pasto sem contorno quebraria o mapa e as regras que
dividem por área.

## O painel da conversa

A tela `/app` tem três áreas: as conversas, o chat e o painel. Pergunta que
rende tabela não vira lista dentro da conversa: o agente manda `openWorkspaceTable`
ou `openWorkspaceEntity`, o painel abre a visão e a resposta escrita fica só com
o resumo. A pergunta seguinte troca o que está na tela em vez de empilhar outra
cópia embaixo, e o botão **Voltar** volta para a visão anterior — o histórico é
limitado (`WORKSPACE_HISTORY_LIMIT`, dez visões).

**O painel é do agente: ele escreve, o produtor lê.** Como o agente não enxerga o
que o produtor mexeu na tela por conta própria, todo comando descreve a visão
inteira — dataset, título e todos os filtros valendo. Não existe comando de
delta ("acrescenta o filtro tal"): as tools de painel são `.strict()`, então uma
chave extra é recusada em vez de aplicada pela metade. O período também precisa
vir em `YYYY-MM-DD`: o navegador não resolve "semana passada", e quem converte é
o modelo, com a data que já está no system prompt.

O estado vive fora do ciclo de render do React (`frontend/src/workspace/workspace.store.ts`),
num store com `getState`/`dispatch`/`subscribe` lido por `useSyncExternalStore`.
É o que permite ler a visão atual no instante em que a tool chega, sem depender
de um render ter acontecido. O reducer e a validação de comando
(`workspace.reducer.ts`, `workspace.commands.ts`) são testados no
`yarn --cwd frontend test`, inclusive o comando que o painel não reconhece —
nesse caso a tool devolve `{ status: 'rejected', error }` e o agente pode se
corrigir na mesma volta.

Página, entidade e período vão para a URL (`?chat=…&view=expenses&from=…&to=…`, e
o gráfico leva `&chart=pie&by=category&measure=amount`), então o link reabre a
mesma visão; um endereço que pede o que o painel não sabe mostrar simplesmente
não abre nada. Os números do painel vêm das mesmas rotas REST das telas manuais —
o modelo escolhe a visão, nunca os valores.

**A tela `/app/financeiro` continua igual e sem agente nenhum.** A duplicação
com o painel é de propósito e temporária.

As tools de painel não têm `execute`: quem executa é o navegador, que devolve o
resultado com `addToolOutput`. Esse caminho deixou de ser exclusivo do
`showManualForm` — a lista de tools executadas no navegador fica em
`browserExecutedTools` (`frontend/src/components/chat/conversation/conversation.tsx`)
e o envio do resultado leva o nome da tool como parâmetro.

## Gráficos no painel

`openWorkspaceChart` é a única tool de gráfico: uma pergunta vira barra, linha ou
pizza no mesmo painel, e trocar o agrupamento ou o período redesenha a visão em
vez de abrir uma segunda. **O modelo escolhe só a apresentação** — `shape`,
`groupBy` e `measure`. Os valores saem das mesmas consultas REST que enchem as
tabelas: o navegador busca os lançamentos, soma por grupo
(`frontend/src/workspace/workspace.series.ts`) e desenha. Nenhum número chega
pelo comando, e a tool recusa qualquer chave a mais.

Cada conjunto diz o que sabe medir (`workspaceChartCapabilities`): despesas por
`category`, `month` ou `day`; receitas por `month` ou `day`; lotes por
`cattleCategory` ou `paddock`; pastos por `paddock`. Forma e agrupamento também
precisam combinar — `line` só ao longo do tempo, `pie` só entre categorias. O que
não combina não quebra o painel: a tool devolve `{ status: 'rejected', error }`
dizendo o que dá para pedir, o painel continua com a visão anterior e o agente se
corrige na mesma volta.

As cores vêm dos tokens do tema (`--color-accent`, `--color-highlight`,
`--color-danger` e misturas), então o mesmo gráfico se lê no claro e no escuro sem
segunda paleta.

## Mapa e contorno de pasto

O contorno do pasto é desenhado sobre imagem de satélite, em coordenada real, na
aba **Mapa** de `/app/rebanho`: um toque marca cada divisa, arrastar um ponto
corrige, tocar nele tira. Isso reverte a decisão antiga de guardar o contorno
relativo a uma imagem carregada — coordenada real é o que dá área calculada,
satélite e, depois, clima.

O que fica gravado em `FarmArea.shape` diz em que espaço foi desenhado:
`{ space: 'geo', version: 1, points: [[lng, lat], …] }` para o que se desenha
hoje, e o `space: 'image'` antigo continua sendo lido sem erro — só não ganha
área calculada. Quem lê e mede é
`backend/src/modules/cattle/boundary/paddock-boundary.ts`; a API devolve o
contorno já com `computedAreaHa` e nunca joga fora uma forma que não conseguiu
entender: ela volta como `boundary: null` em vez de derrubar a resposta.

**A área calculada não substitui a área útil.** Um polígono traçado no satélite
engloba capão, pedra, água e carreador, então a área geométrica sempre supera o
que o gado de fato pasta — e uma regra de lotação alimentada com o número
inflado avisa de menos justamente quando mais importa. As regras
(`MOVEMENT_RULES`) continuam lendo `usableAreaHa`, o número que o produtor
informou; a calculada aparece do lado, como conferência. Quando as duas divergem
mais de 20%, a resposta traz `areaDivergence.significant` e a tela comenta a
diferença — observação, nunca correção automática.

O agente enquadra, não desenha: `openWorkspaceMap` aceita apenas `paddockIds` e
`title`, é `.strict()`, e não existe tool que escreva contorno. Pergunta de lugar
("onde está o lote 12", "quem faz divisa com o pasto 6") abre o mapa no painel
com os pastos citados; desenhar continua sendo ato do produtor na tela.

**A fonte de tiles é um valor de configuração só**, `VITE_SATELLITE_TILES`, lido
em `frontend/src/map/tiles.ts` — nenhum outro arquivo conhece URL de tile. O
padrão é o World Imagery da Esri; trocar de provedor é trocar essa linha do
`.env`. O resto do mapa é geometria própria (`frontend/src/map/geo.ts`:
projeção Web Mercator, área geodésica, enquadramento e grade de tiles), sem
biblioteca de mapa.

## Scripts da raiz

| script | o que faz |
| --- | --- |
| `yarn dev` | sobe backend e frontend juntos |
| `yarn build` | compila os dois |
| `yarn test` | suíte do backend (precisa do Postgres de pé) e a do frontend |
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

Movimentar um lote fecha e abre esses intervalos no mesmo comando que grava
`cattle_movement`, `domain_event`, `outbox_message` e o resultado em
`idempotency_key`. A tela aceita data retroativa, e repetir a mesma chave devolve
o primeiro resultado sem duplicar histórico.

**A trilha de evento começa no movimento de gado.** `rule_evaluation` e
`farm_attention_item` ainda nascem vazias — os tickets 08 e 09 escrevem nelas.
O evento separa quando aconteceu
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
`FarmArea.shape` agora tem validação nos dois sentidos: entra por
`PaddockBoundaryDto` (class-validator, só `space: 'geo'` e ponto dentro do mundo
mapeado) e sai por `readBoundary`, que devolve `null` para o que não conseguir
ler em vez de estourar. `PendingAction.args` continua chegando como `JsonValue`
crua.

**Jest com `watchman: false`.** O watchman instalado nesta máquina está quebrado
(`libfmt` faltando) e fazia o jest sair sem rodar teste nenhum. Se o watchman
for consertado, dá para remover a flag dos dois configs.
