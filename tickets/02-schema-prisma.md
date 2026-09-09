# 02 — Schema Prisma, migrations e seed

**Depende de:** 01

Modelo de dados completo da fatia 1.

**Entidades:** `User`, `Farm`, `Chat`, `Message`, `Expense`, `Revenue`, `ExpenseAllocation`, `PendingAction`, `FarmMapImage`, `FarmArea`.

## Decisões que o schema precisa refletir

- `User` e `Farm` separados, `Farm.ownerUserId`. 1:1 no MVP, mas nada no código pode assumir isso.
- `Farm.onboardingCompleted: Boolean` e `Farm.agentContext: String?` (markdown)
- `Chat.farmId` — chat pertence à fazenda, não ao usuário
- `Message.parts: Json` — o `UIMessage.parts` do AI SDK inteiro
- `ExpenseAllocation` com `areaId: String?` — FK real para `FarmArea`. A allocation "geral" tem `areaId` nulo. **Toda despesa tem ao menos uma.**
- `PendingAction`: `id`, `farmId`, `toolName`, `args: Json`, `status`, `expiresAt`
- Enum de categoria de despesa (8 valores iniciais — revisáveis enquanto não houver dado real)
- Enum `source`: `MANUAL`, `WEB_AGENT`, `WHATSAPP_TEXT`, `WHATSAPP_AUDIO`, `WHATSAPP_IMAGE` (os de WhatsApp já declarados, sem uso ainda)
- `FarmArea` e `FarmMapImage` **entram** nesta fatia, só as tabelas — sem upload, sem editor de polígono, sem tools. Ver ticket 16 para a feature.

## Áreas: mapa sobre imagem, não sobre coordenada geográfica

O mapa da fazenda é uma **imagem que o produtor sobe** (print de satélite, croqui, mapa do CAR). Os polígonos são desenhados sobre essa imagem e persistidos em **coordenadas relativas à imagem**, não em latitude/longitude. Não há GPS, não há GeoJSON, não há PostGIS — e não porque foi adiado, mas porque o produto não precisa: nada no MVP faz consulta espacial, e georreferenciar de verdade custaria um fluxo de cadastro que o produtor não vai completar.

- `FarmMapImage`: `id`, `farmId`, `storageKey`, `widthPx`, `heightPx`, `uploadedAt`. A imagem tem dimensão gravada porque a geometria é lida contra ela.
- `FarmArea`: `id`, `farmId`, `mapImageId`, `name`, `type` (`PASTURE` / `CROP_FIELD` / `OTHER`), `hectares: Decimal?`, `shape: Json?`, `metadata: Json?`
- **`shape` é normalizado em 0..1**, fração da largura e da altura da imagem. Assim o desenho sobrevive a qualquer zoom, `devicePixelRatio` e tamanho de canvas — pixel absoluto amarraria o dado à resolução em que foi desenhado.
- O `shape` carrega o espaço de coordenadas em que foi gravado:

  ```jsonc
  { "space": "image", "version": 1, "points": [[0.12, 0.34], [0.18, 0.31], ...] }
  ```

  `space` existe para que adotar coordenada real depois seja `"space": "geo"` convivendo com as linhas antigas — migração de conteúdo de coluna, não reestruturação. Zod discrimina por `space`.
- `FarmArea.mapImageId` é obrigatório quando há `shape`: um polígono só significa alguma coisa contra a imagem sobre a qual foi desenhado. **Trocar a imagem invalida os desenhos** — a área mantém nome, tipo, hectares e todo o histórico financeiro; perde a geometria. Consequência aceita, documentada aqui para não virar surpresa no ticket 16.

## `hectares` é digitado, não derivado

Sem coordenada real não existe cálculo de área — e o produto **não** vai calibrar escala nem estimar por proporção. `hectares` é um número que o produtor informa (formulário ou agente), e a geometria é puramente visual.

Duas consequências que o schema precisa aceitar de olhos abertos:

- `hectares` é nullable. Área desenhada e ainda não medida é estado legítimo, não erro.
- **`Farm.totalAreaHa` e `SUM(FarmArea.hectares)` não têm invariante entre si.** Ao contrário de `SUM(allocations.amount) = expense.amount`, aqui divergir é normal: ninguém mapeia 100% da propriedade, e os dois números vêm de estimativas diferentes do mesmo produtor. Nenhuma constraint, nenhuma validação — no máximo a UI mostra os dois lado a lado.

## Tipagem do `Json`

Schemas Zod para `Message.parts`, `PendingAction.args` e `FarmArea.shape`, com validação na fronteira do repositório. O `JsonValue` do Prisma não sai da camada de dados.

## Seed

Fazenda Santa Clara com IDs previsíveis. É a fixture que testes e evals de **todas** as fatias vão reusar — vale desenhar com essa responsabilidade em mente, não como dado descartável.

Inclui uma `FarmMapImage` e as áreas que os evals do ticket 14 já citam por nome: **Pasto 4** (`PASTURE`), **Talhão 1** e **Talhão 2** (`CROP_FIELD`), com `shape` e `hectares` preenchidos. Sem elas, "gastei 18 mil reformando o pasto 4" e o rateio 50/50 entre talhões não têm contra o que rodar.
