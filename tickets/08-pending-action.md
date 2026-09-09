# 08 — PendingAction: caminho único de execução para ações destrutivas

**Depende de:** 07 · **Requisitos:** seção 10 do doc (guardrails)

## O mecanismo

Uma tool de nível 3 **nunca executa direto**. Ela grava uma `PendingAction` (`toolName`, `args`, `status`, `expiresAt`) e retorna "aguardando confirmação". A execução só acontece via `resolvePendingAction(id, 'confirm' | 'cancel')`.

O ponto: se a única forma de executar é resolver uma `PendingAction`, é **impossível** um caminho de código novo esquecer de pedir confirmação. Com verificação espalhada, o guardrail existe enquanto alguém lembrar.

## Escopo

- Nesta fatia a única ação de nível 3 é **exclusão de lançamento**, mas o mecanismo nasce genérico: `moveHerd`, `deleteArea` e a substituição da imagem do mapa (ticket 16) dependem dele. Não há `changeAreaGeometry` — o agente nunca desenha polígono.
- Card de confirmação renderizado na web a partir da pendência
- Expiração: pendência vencida não executa
- A pendência é resolvível de outro request e outro momento — o renderizador de botões do WhatsApp vai consumir a mesma tabela, e lá a confirmação pode chegar 10 minutos depois

## Cobertura de teste

Tool de nível 3 gera PendingAction e não altera dado · confirmar executa e marca resolvida · cancelar não executa · pendência expirada não executa · pendência de outra fazenda dá 404 · confirmar duas vezes executa uma vez só.
