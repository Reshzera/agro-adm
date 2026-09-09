# 01 — Bootstrap do monorepo e ambiente local

**Depende de:** nada

Estrutura inicial do repositório e ambiente de desenvolvimento.

- `git init` (o diretório ainda não é repo)
- `api/` — NestJS com **adaptador Express**, `bodyParser: false` no `NestFactory.create()` desde já (BetterAuth exige, e o webhook do WhatsApp depende disso depois)
- `web/` — React SPA (Vite)
- Monorepo simples: sem workspaces, sem pacote de contratos compartilhado
- `docker-compose.yml` com Postgres 16, volume nomeado, porta exposta
- `.env.example` com `DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `HOST_URL`
- `HOST_URL` nasce aqui mesmo sem uso — o ngrok do WhatsApp consome depois
- Scripts: `dev`, `build`, `test`, `eval` (o `eval` pode ficar como stub)

## Armadilha conhecida

`bodyParser: false` faz com que **nenhuma rota parseie JSON**. O ticket 04 (auth) tem que registrar `express.json()` para tudo que não for o prefixo do BetterAuth. Até lá, só rotas GET se comportam como esperado — não vale criar POST antes disso e se perguntar por que o corpo vem vazio.

## Nota de ambiente

A porta 5432 do host pode já estar ocupada por outro Postgres local. Se estiver, mapear para outra porta (ex. 5433) no host e manter 5432 dentro do container.

## Critério de pronto

`docker compose up` sobe o banco, `api` e `web` sobem e conversam em localhost.
