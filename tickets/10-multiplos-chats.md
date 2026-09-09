# 10 — Múltiplos chats por fazenda

**Depende de:** 06

Requisito que **não está no doc original** — o RF-11 fala em "conversação persistente" no singular. Surgiu na conversa de design: a fazenda tem N conversas.

- Lista de chats da fazenda, ordenada por atividade recente
- Criar conversa nova
- Título gerado automaticamente a partir das primeiras mensagens — bom uso de um modelo mais barato, é tarefa mecânica e não precisa do `gpt-5`
- Renomear e arquivar/excluir conversa
- Abrir conversa antiga recarrega `parts` íntegro, com componentes re-renderizados a partir dos tool results congelados

## Preparando a fatia seguinte

O chat de WhatsApp vai ser um `Chat` perpétuo por fazenda com `source: WHATSAPP`, aparecendo nesta mesma lista como "Conversa do WhatsApp". A lista já deve comportar um chat marcado como de outro canal.

Lembrete de desenho: **dados são compartilhados entre canais, histórico de conversa não.** Registrar diesel pelo WhatsApp e perguntar "quanto gastei hoje?" na web funciona — o número vem do banco, não da memória do chat.

## Cobertura de teste

Chats isolados por fazenda · recarga devolve parts íntegro · lista não vaza chat de outra fazenda.
