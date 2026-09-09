# 15 — CI/CD: deploy automático da main para a EC2

**Depende de:** registro de domínio · **Status: BACKLOG — não iniciar ainda**

Enquanto o desenvolvimento roda local (WhatsApp via número de teste da Meta + ngrok), **não existe deploy de produção**. Este ticket destrava quando houver domínio registrado.

## Infra decidida

- EC2 única com Docker Compose (sem ECS/Fargate — baixa complexidade inicial)
- **Postgres em RDS**, não no Compose de produção. O Compose local tem Postgres em container; produção usa RDS por causa de snapshot e point-in-time recovery. É a apólice mais barata do projeto: o dado do piloto é insubstituível.
- Prisma → deploy roda `prisma migrate deploy`

## Decisões tomadas

- **Registry: GHCR** — já autenticado dentro do Actions, sem role/OIDC de IAM para configurar
- **Acesso à EC2: AWS SSM Session Manager** — dispensa abrir a porta 22 para o mundo
- **Reverse proxy + TLS: Caddy** — Let's Encrypt automático, config curta, termina os dois subdomínios
- **Downtime curto aceito** (~10s) — EC2 única; blue-green exigiria mais peças do que vale agora
- **Argo CD descartado** — é GitOps para Kubernetes, exigiria introduzir um cluster só para usá-lo

## Escopo

1. `.github/workflows/deploy.yml`, trigger `push` na `main`
2. Build das imagens (api, web) e push para GHCR
3. Deploy via SSM: pull das imagens + `docker compose up -d`
4. **Ordem obrigatória:** `prisma migrate deploy` → sobe API nova → healthcheck. Migration antes do container novo, para que uma migration quebrada falhe antes de derrubar o que funcionava.
5. Falha ruidosa no healthcheck
6. Secrets via GitHub Secrets → `.env` na EC2: `OPENAI_API_KEY`, `DATABASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `BETTER_AUTH_SECRET`, `HOST_URL`

## Decisão de dia zero que este ticket carrega

**Topologia de subdomínios.** SPA e API em origens diferentes exigem cookie `SameSite=None`, o que entra em rota de colisão com o Safari ITP e a morte do cookie de terceiros. A saída é `app.dominio.com.br` + `api.dominio.com.br` com `crossSubDomainCookies` em `.dominio.com.br` — vira same-site e os dois problemas somem.

Retrofitar isso depois **desloga todo mundo**. E em dev (`localhost:5173` + `localhost:3000`) o problema não aparece, então é fácil descobrir tarde demais.

## Não incluído

Staging · rollback automático de migration · autoscaling.
