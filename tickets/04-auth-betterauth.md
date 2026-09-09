# 04 — Auth com BetterAuth e criação da Farm no signup

**Depende de:** 03 · **Requisitos:** RF-01 a RF-05

- BetterAuth via `@thallesp/nestjs-better-auth`, adaptador Express
- Cadastro, login, logout
- **Verificação de e-mail obrigatória** antes de liberar a conta
- Guard global protegendo tudo por padrão; rotas públicas marcadas explicitamente
- Perfil editável: nome, e-mail, telefone

## A decisão que mais afeta o resto do sistema

O signup cria a `Farm` vazia (`name: null`, `onboardingCompleted: false`) na mesma transação. Consequência deliberada: `farmId` nunca é nulo em nenhuma assinatura de função, query ou guard do sistema.

- Resolver `farmId` a partir da sessão e disponibilizar no contexto da requisição
- Toda query de dado de fazenda passa por esse escopo
- Usuário de outra fazenda recebe **404, não 403** — não vaza existência do recurso

## Pendência herdada do ticket 01

`bodyParser: false` está ligado desde o bootstrap. Este ticket precisa registrar `express.json()` para todas as rotas que **não** sejam o prefixo do BetterAuth — senão nenhum POST do sistema recebe corpo.

## Cobertura de teste

Signup cria Farm vazia · conta não verificada não acessa rota protegida · usuário da fazenda A recebe 404 em recurso da fazenda B.
