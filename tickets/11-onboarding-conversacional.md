# 11 — Onboarding conversacional da fazenda

**Depende de:** 07 · **Requisitos:** RF-06 a RF-09

O primeiro contato do produtor com o produto é uma conversa, não um formulário.

- A `Farm` já existe vazia desde o signup (ticket 04). O agente lê `onboardingCompleted: false` no system prompt e conduz.
- Coleta: nome da fazenda, hectares aproximados, localização, atividade principal (pecuária / agricultura / mista), culturas, cabeças aproximadas
- Uma pergunta por vez, no ritmo da conversa — não um interrogatório
- `updateFarm` grava o estruturado; `updateFarmContext` grava o qualitativo
- Marca `onboardingCompleted: true` quando o essencial estiver preenchido, e **para de perguntar**
- Informação extra que o produtor der ("trabalhamos com Nelore", "o João é o gerente") vai para o `agentContext`

## RF-08 é requisito, não conforto

Tudo que o onboarding coleta tem que ser editável por formulário. O agente não pode ser o único caminho de manutenção dos dados.

## Cobertura de teste

Fazenda incompleta → agente pergunta em vez de inventar · dado informado é gravado no campo certo · `onboardingCompleted` vira true e o agente para de perguntar · informação qualitativa vai para agentContext, não para coluna estruturada.
