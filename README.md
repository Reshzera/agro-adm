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
| `yarn eval` | stub — a pipeline de eval chega no ticket 14 |
| `yarn db:up` / `db:down` / `db:logs` | Postgres do compose |

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

**Jest com `watchman: false`.** O watchman instalado nesta máquina está quebrado
(`libfmt` faltando) e fazia o jest sair sem rodar teste nenhum. Se o watchman
for consertado, dá para remover a flag dos dois configs.
