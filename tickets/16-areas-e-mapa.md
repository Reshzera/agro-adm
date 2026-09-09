# 16 — Áreas da propriedade e mapa sobre imagem

**Depende de:** 09 · **Status: fatia seguinte — desenho fechado, implementação depois da fatia 1**
**Requisitos:** RF-38 a RF-46, RF-51, RF-52, RF-58, RF-59, RF-61

As tabelas `FarmMapImage` e `FarmArea` já nascem no ticket 02. Este ticket é a feature: subir a imagem, desenhar em cima dela, e deixar o agente administrar as áreas.

## A decisão que define o ticket

**O mapa é uma imagem que o produtor sobe, não um mapa georreferenciado.** Print de satélite, croqui do agrônomo, mapa do CAR — o que ele tiver. Os polígonos são desenhados sobre essa imagem e gravados em coordenadas relativas a ela (`[0..1, 0..1]`), nunca em latitude/longitude.

Isso troca precisão geográfica por um cadastro que o produtor termina. Georreferenciar de verdade exigiria basemap, projeção, e um fluxo em que ele acerta o contorno da propriedade sobre imagem de satélite que ele não reconhece — trabalho real, para um ganho que o MVP não consome: **nenhuma funcionalidade do produto faz consulta espacial.** O que o sistema precisa saber de cada área é nome, tipo e hectares, e nada disso sai da geometria.

A troca fica barata de desfazer porque o `shape` grava o espaço em que foi desenhado (`"space": "image"`). Adotar coordenada real depois é `"space": "geo"` convivendo com as linhas antigas.

## Upload da imagem

- Uma `FarmMapImage` ativa por fazenda. Subir outra é substituir.
- Formatos: PNG, JPEG, WebP. Limite de tamanho e validação de tipo **pelo conteúdo**, não pela extensão nem pelo `Content-Type` do cliente.
- `widthPx`/`heightPx` extraídos no servidor e gravados — a normalização do polígono é lida contra eles.
- Storage atrás de uma interface `MapImageStorage` (`put`/`get`/`delete`), com implementação em disco local (volume no compose) para dev. S3 depois vira troca de implementação, não de chamador. Mesmo padrão do provider de modelo no ticket 06.
- Servida por rota autenticada e escopada por `farmId` — **imagem de fazenda não é arquivo público**. Um produtor não acessa o mapa de outro por adivinhar a URL.

### Trocar a imagem invalida os desenhos

Um polígono normalizado só significa alguma coisa contra a imagem sobre a qual foi traçado. Ao substituir a imagem, as áreas mantêm nome, tipo, hectares, lotes e todo o histórico financeiro; perdem a geometria e voltam a "não desenhada".

Isso é consequência do modelo, não bug — mas **precisa ser dito ao produtor antes de confirmar**, não descoberto depois. Substituir imagem é ação destrutiva: passa por `PendingAction` quando vier do agente, e por confirmação explícita na UI quando vier do botão.

## Editor de polígono

- Canvas/SVG sobre a imagem: clicar para adicionar vértice, fechar o polígono, arrastar vértice para editar (RF-41, RF-45).
- Zoom e pan. As coordenadas gravadas são normalizadas, então o nível de zoom não vaza para o dado.
- Nomear (RF-42) e classificar em `PASTURE` / `CROP_FIELD` / `OTHER` (RF-43).
- **`hectares` é um campo digitado.** Sem coordenada real não existe cálculo de área, e o produto não calibra escala nem estima por proporção — o produtor informa o número que ele já conhece. Área desenhada sem hectares é estado válido.
- Área sem `shape` também é estado válido: dá para cadastrar "Pasto 4" e usá-lo em despesa antes de existir qualquer mapa. **O financeiro não depende do desenho.**
- Excluir área (RF-46): sem dependências, direto; com despesas ou lotes vinculados, confirmação nomeando o que será afetado.

## Tools do agente

`getAreas`, `getArea`, `createArea`, `updateArea`, `deleteArea`.

- Mesma regra inegociável do ticket 07: `farmId` vem do contexto autenticado, **nenhuma tool aceita `farmId` no schema Zod**.
- **O agente não desenha polígono.** Ele cria, renomeia, classifica, informa hectares e exclui — a geometria é sempre do usuário, no editor. "Cadastra o Pasto 7 com 40 hectares" funciona; o desenho fica pendente.
- `deleteArea` é nível 3 → `PendingAction` (ticket 08). `updateArea` que mexe em `shape` não existe como tool.
- `getAreas` devolve `id`, `name`, `type`, `hectares` e se tem desenho. Contagem de animais e custo por área vêm das tools de seus próprios domínios, não daqui.

## Generative UI

Entram no catálogo do ticket 09: `FarmMap` e `AreaDetails`.

- `FarmMap` renderiza a imagem com os polígonos por cima, cada um com nome e hectares (RF-51). Clicar abre `AreaDetails` (RF-52).
- Segue a convenção do ticket 09: o componente é escolhido pelo `part.type` da tool, não por nome de componente vindo do modelo.
- "Quero cadastrar meus pastos" é tool de UI pura — abre o editor, não é consequência de consulta.
- Sem imagem subida, `FarmMap` degrada para lista de áreas com um CTA de upload. Nunca tela quebrada.

## Página `/app/fazenda`

Mapa, upload/troca da imagem, lista de áreas e cadastro manual — RF-08 vale aqui também: o agente não pode ser o único caminho.

## Custos por área

`ExpenseAllocation.areaId` já existe e já é FK desde o ticket 02, e o rateio já é imposto pelo domínio do ticket 05. O que este ticket acrescenta é o agente conseguir **resolver nome → `areaId`** ("metade no Talhão 1 e metade no Talhão 2") e a consulta de custo por área (RF-61).

Nomes de área entram no system prompt como `id + nome + tipo` apenas — a regra do ticket 06. Hectares e valores vêm por tool, nunca no prompt.

## Cobertura de teste

Upload grava dimensões e só aceita imagem de verdade · imagem de outra fazenda dá 404 · polígono normalizado volta íntegro · trocar a imagem zera `shape` e preserva nome, hectares e despesas · área sem `shape` aceita despesa normalmente · `deleteArea` pelo agente gera `PendingAction` e não apaga · nenhuma tool de área aceita `farmId` · agente resolve "Talhão 1" para o `areaId` do seed.
