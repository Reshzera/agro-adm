# 06 — Loop do agente: endpoint de chat, streaming e persistência

**Depende de:** 04 · **Requisitos:** RF-10, RF-11

O esqueleto conversacional, ainda sem tools de negócio.

- Endpoint de chat com Vercel AI SDK no servidor, `useChat` consumindo o stream no cliente
- Modelo `gpt-5`, **provider injetado** (o ticket 03 depende disso para trocar pelo mock)
- Persistência: `Chat` por `farmId`; `Message` grava o `UIMessage.parts` inteiro como `jsonb`
- Recarregar uma conversa devolve `parts` íntegro para o `useChat` consumir direto, sem camada de tradução
- **Tool results são congelados** — recarregar histórico nunca reexecuta tool
- `/app` no estado inicial: saudação e campo de pergunta. Sem gráficos, sem dashboard.

## System prompt

Carrega: papel, guardrails, data corrente, e um resumo compacto da fazenda — nome, hectares, atividade, `agentContext`, `onboardingCompleted`.

Hectares por área e contagens de animais **não** entram no prompt; vêm por tool. O que entra de áreas é só `id + nome + tipo` — as áreas já existem no schema desde o ticket 02 e o seed tem três. Nome e tipo bastam para desambiguar "pasto 4" sem carregar dado que envelhece. Lotes seguem a mesma regra na fatia em que existirem.

## Cobertura de teste (modelo mockado)

Mensagem gera Chat e Message com parts íntegro · recarga devolve o mesmo parts · chat de outra fazenda dá 404 · resposta chega em stream.
