# 13 — Páginas públicas e configurações

**Depende de:** 11

O que falta de superfície para a fatia 1 fechar.

## Públicas

- Landing: proposta de valor, benefícios, CTA. Sem demo interativa nesta fatia.
- Login, cadastro, verificação de conta

## `/app/configuracoes`

- Perfil: nome, e-mail, telefone
- Dados da fazenda editáveis por formulário (**RF-08** — o agente não pode ser o único caminho de manutenção)
- Campo de `agentContext` **visível e editável pelo produtor**. Ele deve poder ver e corrigir o que o agente "aprendeu" sobre a fazenda — inclusive apagar algo que o agente entendeu errado.
- Espaço reservado para WhatsApp (número associado + verificação), implementado na fatia seguinte
