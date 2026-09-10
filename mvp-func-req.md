# Requisitos Funcionais — MVP Agente para Gestão de Fazenda

## 1. Visão geral

O produto será uma aplicação web voltada à gestão de propriedades rurais, com uma interface principal baseada em conversação com um agente de IA.

O objetivo do MVP é validar se produtores rurais percebem valor em utilizar linguagem natural, principalmente via aplicação web e WhatsApp, para:

- registrar receitas e despesas;
- consultar dados financeiros;
- visualizar informações da propriedade;
- acompanhar preços de commodities;
- cadastrar e visualizar áreas da fazenda;
- associar custos, produção e animais às diferentes áreas;
- movimentar lotes de animais entre pastos;
- interagir com dados da fazenda por meio de um agente;
- receber interfaces e visualizações dinamicamente conforme a conversa.

A aplicação será desenvolvida utilizando:

- **Frontend:** React SPA;
- **Backend:** NestJS;
- **Autenticação:** BetterAuth;
- **Banco de dados:** PostgreSQL (sem extensões geográficas — PostGIS está fora do MVP);
- **Mapa:** imagem da propriedade enviada pelo produtor, com polígonos desenhados sobre ela (sem georreferenciamento);
- **Integração externa:** WhatsApp;
- **Agente:** LLM com acesso controlado a tools internas.

Não haverá gateway de pagamento no MVP.

---

# 2. Princípios de arquitetura

## 2.1 Usuário e fazenda devem ser entidades diferentes

Embora no MVP exista uma relação de **um usuário para uma fazenda**, o banco de dados não deve considerar `User` e `Farm` como a mesma entidade.

Estrutura inicial:

```ts
User {
  id
  name
  email
}

Farm {
  id
  ownerUserId

  name
  totalAreaHa
  primaryActivity
  location

  agentContext
}
```

No MVP:

```text
User 1 ───── 1 Farm
```

Isso permite futuramente suportar:

```text
1 usuário → várias fazendas

1 fazenda → vários usuários
```

sem necessidade de uma reestruturação significativa do banco.

---

# 3. Autenticação e usuário

## RF-01 — Cadastro de usuário

O sistema deve permitir que um usuário crie uma conta.

A autenticação deverá utilizar **BetterAuth**.

---

## RF-02 — Login

O usuário deve conseguir realizar login utilizando suas credenciais.

---

## RF-03 — Logout

O usuário deve conseguir encerrar sua sessão.

---

## RF-04 — Verificação de conta

O sistema deverá possuir uma verificação simples da conta.

Preferencialmente:

```text
Cadastro
↓
Verificação de e-mail
↓
Conta liberada
```

---

## RF-05 — Perfil

O usuário deverá possuir uma área onde possa editar informações básicas da conta.

Exemplos:

- nome;
- e-mail;
- telefone;
- WhatsApp associado.

---

# 4. Onboarding conversacional

O primeiro contato do usuário com o produto deverá ocorrer por meio do agente.

## RF-06 — Primeiro acesso

Após criar sua conta, o usuário deverá iniciar uma conversa com o agente.

Essa conversa deverá funcionar como onboarding da propriedade.

---

## RF-07 — Coleta de contexto da fazenda

O agente deverá obter informações iniciais como:

- nome da fazenda;
- quantidade aproximada de hectares;
- localização;
- atividade principal;
- pecuária;
- agricultura;
- atividade mista;
- principais culturas;
- quantidade aproximada de animais;
- outras informações relevantes fornecidas pelo usuário.

Exemplo:

```text
Agente:

Como se chama sua fazenda?
```

```text
Usuário:

Fazenda Santa Clara.
```

```text
Agente:

Qual é aproximadamente a área total dela?
```

---

## RF-08 — Cadastro manual

Todas as informações coletadas pelo onboarding também deverão poder ser cadastradas ou alteradas manualmente.

O uso do agente não pode ser obrigatório para manutenção posterior dos dados.

---

# 5. Contexto da fazenda para o agente

A propriedade deverá possuir um campo textual de contexto geral.

Exemplo:

```md
# Fazenda Santa Clara

- Propriedade de aproximadamente 840 hectares.
- Principal atividade: pecuária de corte.
- Também possui produção de milho.
- Aproximadamente 920 cabeças.
- João é gerente da propriedade.
- O proprietário acompanha custos principalmente de forma mensal.
```

Esse campo pode ser armazenado como Markdown ou texto estruturado.

Sugestão:

```ts
Farm {
  agentContext: string
}
```

---

## RF-09 — Atualização de contexto pelo agente

O agente poderá adicionar ou atualizar informações no contexto da propriedade durante as conversas.

Exemplo:

```text
Usuário:

A gente trabalha principalmente com Nelore.
```

O agente poderá registrar essa informação no contexto.

---

## 5.1 Limitações do campo de contexto

O `agentContext` não deve ser utilizado para armazenar informações necessárias para cálculos ou operações.

Informações como:

```text
Pasto 3 possui 48,6 hectares.
```

```text
Lote 8 possui 82 animais.
```

```text
Despesa de R$ 18.430.
```

deverão existir como dados estruturados no banco.

O contexto textual deverá conter principalmente informações qualitativas.

---

# 6. Interface principal

A página inicial autenticada da aplicação não deverá ser um dashboard tradicional.

Ela deverá funcionar como um **workspace conversacional**.

## RF-10 — Homepage conversacional

Ao entrar na aplicação, o usuário verá inicialmente uma interface simples.

Exemplo:

```text
              Boa tarde, João.

          O que você quer saber
          sobre sua fazenda hoje?


     ┌────────────────────────────┐
     │ Pergunte sobre sua fazenda │
     └────────────────────────────┘
```

A referência de experiência é semelhante à página inicial do ChatGPT.

---

## RF-11 — Conversação persistente

O usuário deverá conseguir manter uma conversa contínua com o agente.

---

# 7. Generative UI

O agente deverá conseguir modificar dinamicamente a interface apresentada ao usuário.

## RF-12 — Renderização dinâmica

A partir da conversa, o agente poderá solicitar a renderização de componentes.

Exemplo:

```text
Usuário:

Quanto gastei nos últimos seis meses?
```

Resposta:

```text
Você gastou R$ X nos últimos seis meses.
```

Além do texto, a aplicação poderá renderizar:

```text
[Gráfico de despesas — últimos 6 meses]
```

---

Outro exemplo:

```text
Usuário:

Quero cadastrar os meus pastos.
```

A UI poderá renderizar:

```text
[Mapa da fazenda]

[Desenhar pasto]
[Editar área]
[Excluir área]
```

---

## RF-13 — Catálogo fechado de componentes

O agente não deverá gerar React, HTML ou JavaScript arbitrariamente.

Deverá existir um catálogo de componentes permitidos.

Exemplo:

```text
FinancialSummary
ExpenseChart
RevenueChart
ExpenseTable

CommodityQuotes

FarmMap
AreaDetails
HerdDetails

ConfirmationCard

ManualForm
OnboardingQuestion
```

---

O agente poderá retornar algo semelhante a:

```json
{
  "type": "render_ui",
  "component": "expense_chart",
  "props": {
    "range": "6_months"
  }
}
```

O frontend ficará responsável por transformar essa definição no componente React correspondente.

---

# 8. Agente e tools

O agente deverá possuir acesso a um conjunto controlado de funções do sistema.

O LLM nunca deverá receber acesso direto ao banco de dados ou permissão para executar SQL arbitrário.

## RF-14 — Tools controladas

Exemplos iniciais:

```text
getFarm()
updateFarm()

getExpenses()
getRevenue()

createExpense()
createRevenue()

getFinancialSummary()

getAreas()
getArea()

getHerds()
moveHerd()

allocateExpenseToArea()

getCommodityQuotes()
```

---

# 9. Consultas financeiras pelo agente

## RF-15 — Consultar despesas

O agente deverá responder perguntas como:

```text
Quanto gastei neste mês?
```

```text
Quanto gastei com diesel?
```

```text
Quanto gastei no Pasto 4?
```

```text
Qual foi meu maior gasto em agosto?
```

---

## RF-16 — Consultar receitas

Exemplos:

```text
Quanto entrou este mês?
```

```text
Quanto eu recebi com venda de gado?
```

```text
Quanto foi minha receita nos últimos seis meses?
```

---

## RF-17 — Fazer cálculos

O agente poderá utilizar os dados da propriedade para realizar cálculos.

Exemplo:

```text
Receita
-
Despesa
=
Resultado mensal
```

---

# 10. Guardrails do agente

O agente deverá operar com diferentes níveis de autorização.

## Nível 1 — Leitura

Não necessita de confirmação.

Exemplos:

```text
getExpenses()
getRevenue()
getFarmAreas()
getCommodityQuotes()
getFinancialSummary()
```

---

## Nível 2 — Criação de dados

Dependendo da ação, poderá haver confirmação.

Exemplos:

```text
createExpense()
createRevenue()
updateFarmContext()
```

---

## Nível 3 — Alterações operacionais relevantes

Sempre deverão exigir confirmação.

Exemplos:

```text
moveHerd()
deleteExpense()
deleteArea()
changeAreaGeometry()
```

---

## Nível 4 — Operações externas

Não fazem parte do MVP.

Exemplos futuros:

```text
makePix()
payInvoice()
sellCommodity()
buyInputs()
```

---

# 11. Financeiro

## RF-18 — Cadastro de despesa

O sistema deverá permitir o cadastro de despesas por:

- formulário;
- agente web;
- WhatsApp.

Campos mínimos:

```text
id
farmId

amount
date

description
category

areaId opcional

source
createdAt
```

---

## RF-19 — Cadastro de receita

O sistema deverá permitir o cadastro de receitas pelos mesmos canais:

- formulário;
- agente web;
- WhatsApp.

---

## RF-20 — Origem do lançamento

Cada lançamento deverá registrar sua origem.

Exemplo:

```text
MANUAL

WEB_AGENT

WHATSAPP_TEXT

WHATSAPP_AUDIO

WHATSAPP_IMAGE
```

---

# 12. WhatsApp

O WhatsApp será uma das principais interfaces do MVP.

A integração deverá funcionar em duas direções.

---

# 13. Cadastro do WhatsApp

## RF-21 — Associar número

O usuário deverá conseguir informar qual número de WhatsApp está associado à sua conta.

Exemplo:

```text
+55 67 99999-9999
```

---

## RF-22 — Verificação do número

Idealmente deverá existir algum processo simples de confirmação de posse do número.

---

## RF-23 — Identificação do usuário

Quando o backend receber uma mensagem do WhatsApp, deverá identificar automaticamente o usuário e a fazenda associados àquele número.

Fluxo:

```text
WhatsApp
↓
Webhook
↓
Telefone
↓
User
↓
Farm
```

---

# 14. Entrada via WhatsApp

O MVP deverá aceitar:

- texto;
- áudio;
- imagem.

---

## RF-24 — Texto

Exemplo:

```text
Gastei 4.800 de diesel hoje.
```

O agente deverá interpretar:

```text
Tipo: despesa

Valor: R$ 4.800

Categoria: combustível

Data: hoje
```

---

## RF-25 — Áudio

O sistema deverá transcrever o áudio.

Exemplo:

```text
"Paguei trinta e dois mil na reforma do pasto quatro."
```

O agente deverá identificar:

```text
Despesa

R$ 32.000

Categoria:
Reforma de pastagem

Área:
Pasto 4
```

---

## RF-26 — Imagem

O usuário poderá enviar uma foto.

Exemplo:

```text
Foto de recibo ou nota.
```

O agente poderá extrair informações e propor:

```text
Encontrei uma compra de R$ 8.420 de diesel.

Deseja registrar?
```

---

# 15. Saída via WhatsApp

## RF-27 — Envio de mensagens

O sistema deverá conseguir iniciar mensagens para o produtor.

Isso será utilizado futuramente para notificações e lembretes.

Exemplo:

```text
Você possui uma conta vencendo amanhã.
```

ou:

```text
O lote 18 está há 11 dias no Pasto 4.
```

No MVP, a infraestrutura deverá existir, mesmo que as automações iniciais sejam simples.

---

# 16. Confirmações pelo WhatsApp

## RF-28 — Confirmação de ações

Ações relevantes deverão pedir confirmação.

Exemplo:

```text
Vou mover o Lote 12, com 84 animais,
do Pasto 3 para o Pasto 8.

Confirma?
```

Opções:

```text
Confirmar

Cancelar
```

Somente após confirmação a tool deverá ser executada.

---

# 17. Dashboard financeiro

Embora a página inicial seja conversacional, deverá existir uma representação visual do financeiro quando solicitada.

## RF-29 — Resumo financeiro

O sistema deverá apresentar pelo menos:

```text
Receitas

Despesas

Resultado
```

---

## RF-30 — Gráficos

Inicialmente deverão existir:

```text
Receitas por mês

Despesas por mês

Receitas vs. despesas

Despesas por categoria
```

---

## RF-31 — Lista de movimentações

Deverá existir uma interface manual para visualização dos lançamentos.

Exemplo:

| Data  | Descrição | Categoria   | Área     |     Valor |
| ----- | --------- | ----------- | -------- | --------: |
| 04/09 | Diesel    | Combustível | Geral    |  R$ 8.200 |
| 05/09 | Adubo     | Insumo      | Talhão 3 | R$ 41.300 |

---

## RF-32 — Editar movimentações

O usuário deverá conseguir editar manualmente receitas e despesas.

---

# 18. Cotações de mercado

O MVP deverá possuir cotações das seguintes commodities:

```text
Boi gordo

Soja

Milho
```

---

## RF-33 — Integração com API de mercado

O backend deverá utilizar um provider externo para consultar as cotações.

Inicialmente deverá ser priorizada uma API gratuita ou de baixo custo.

---

## RF-34 — Abstração de provider

O sistema não deverá ficar acoplado diretamente a uma única API.

Sugestão:

```ts
interface CommodityProvider {
  getCattleQuote();
  getSoyQuote();
  getCornQuote();
}
```

Dessa forma, um provider gratuito poderá ser substituído futuramente por:

```text
CEPEA

B3

DATAGRO

provider comercial
```

---

## RF-35 — Persistência das cotações

As cotações deverão ser armazenadas no banco.

Exemplo:

```ts
CommodityQuote {
  id

  commodity
  price
  unit

  source
  region

  quotedAt
}
```

---

## RF-36 — Atualização periódica

O sistema deverá consultar a API automaticamente.

Arquitetura:

```text
API externa
↓
Job/Cron NestJS
↓
CommodityQuote
↓
Aplicação
```

Não será necessário consultar a API externa a cada carregamento de página.

---

## RF-37 — Histórico

O banco deverá ser preparado para armazenar histórico de preços.

Isso permitirá futuramente perguntas como:

```text
Quanto está o boi hoje?
```

e:

```text
Quanto estava há um mês?
```

---

# 19. Cadastro do mapa da fazenda

O usuário deverá possuir uma área destinada ao mapa da propriedade.

**Decisão de modelagem:** o mapa do MVP **não é georreferenciado**. A representação da propriedade é uma **imagem enviada pelo próprio produtor** — print de satélite, croqui do agrônomo, mapa do CAR — e os polígonos são desenhados sobre essa imagem.

Motivo: nenhuma funcionalidade do MVP faz consulta espacial. O que o sistema precisa saber de cada área é nome, tipo e hectares, e nada disso depende de coordenada real. Exigir georreferenciamento acrescentaria basemap, projeção e um passo de cadastro que o produtor provavelmente não termina, sem entregar nada que o produto consuma.

## RF-38 — Visualização da propriedade

A aplicação deverá apresentar a imagem da propriedade com as áreas desenhadas por cima, com zoom e navegação.

---

## RF-39 — Upload da imagem da propriedade

O usuário deverá conseguir enviar uma imagem da propriedade (PNG, JPEG ou WebP).

- Uma imagem ativa por fazenda; enviar outra substitui a anterior.
- A imagem é privada e servida por rota autenticada, escopada pela fazenda.
- **Substituir a imagem invalida os polígonos existentes.** As áreas mantêm nome, tipo, hectares e todo o histórico financeiro, mas perdem o desenho. O sistema deverá avisar antes de confirmar.

---

## RF-40 — Coordenadas relativas à imagem

Os vértices dos polígonos deverão ser persistidos como fração da largura e da altura da imagem (`0..1`), nunca como latitude/longitude.

Isso mantém o desenho correto em qualquer zoom, resolução de tela ou tamanho de canvas.

Import de `KML`, `KMZ` e `GeoJSON` está **fora do MVP**.

---

# 20. Áreas da propriedade

Deverá existir uma entidade para a imagem do mapa:

```ts
FarmMapImage {
  id

  farmId

  storageKey
  widthPx          // dimensões gravadas: a geometria é lida contra elas
  heightPx

  uploadedAt
}
```

E uma entidade genérica chamada `FarmArea`.

```ts
FarmArea {
  id

  farmId
  mapImageId       // a imagem sobre a qual o polígono foi desenhado

  name
  type

  shape            // jsonb — vértices em coordenadas 0..1 da imagem

  hectares         // informado pelo produtor, não calculado

  metadata
}
```

O `shape` grava o espaço de coordenadas em que foi desenhado:

```jsonc
{ "space": "image", "version": 1, "points": [[0.12, 0.34], [0.18, 0.31]] }
```

O campo `space` existe para que uma adoção futura de coordenada real (`"space": "geo"`) conviva com os registros antigos — migração de conteúdo de coluna, não reestruturação do banco.

`shape` e `hectares` são opcionais. Área cadastrada sem desenho e sem hectares é estado válido: dá para lançar despesa no "Pasto 4" antes de existir qualquer mapa.

---

Tipos iniciais:

```text
PASTURE

CROP_FIELD

OTHER
```

---

# 21. Polígonos

## RF-41 — Criar área

O usuário deverá conseguir desenhar um polígono sobre o mapa.

---

## RF-42 — Nomear área

Exemplo:

```text
Pasto 1

Pasto 2

Talhão Norte

Talhão Soja
```

---

## RF-43 — Tipo da área

O usuário deverá identificar se aquela região representa:

```text
Pasto

Área agrícola

Outro
```

---

## RF-44 — Informar hectares

O produtor deverá informar os hectares de cada área, por formulário ou dizendo ao agente.

**Não há cálculo automático.** Sem coordenada geográfica real não existe área derivável do desenho, e o MVP não vai calibrar escala nem estimar por proporção — o produtor já conhece o tamanho dos seus pastos. O polígono é representação visual; o número é dado informado.

Consequência aceita: `Farm.totalAreaHa` e a soma dos hectares das áreas **podem divergir**, e isso não é erro. Ninguém mapeia 100% da propriedade, e os dois números são estimativas independentes do mesmo produtor. Não há constraint entre eles.

---

## RF-45 — Editar polígono

O usuário deverá conseguir editar os vértices.

---

## RF-46 — Excluir área

Áreas sem dependências poderão ser excluídas.

Caso existam dados associados, o sistema deverá apresentar confirmação.

---

# 22. Persistência dos polígonos

Os polígonos deverão ser persistidos em coluna `jsonb` no PostgreSQL, como lista de vértices em coordenadas relativas à imagem.

O MVP não utilizará PostGIS. Consultas espaciais (interseção, distância, contém) estão fora do escopo — o que o sistema precisa saber sobre cada área (nome, tipo, hectares) vive em colunas escalares.

Fluxo:

```text
Usuário envia imagem da propriedade
↓
NestJS grava a imagem e suas dimensões em px
↓
Usuário desenha polígono sobre a imagem
↓
Frontend normaliza os vértices para 0..1
↓
Usuário informa os hectares da área
↓
PostgreSQL (jsonb + hectares numeric)
```

Isso permite que o agente consulte e administre as áreas **sem nunca analisar a imagem** — ele lê nome, tipo e hectares do banco. A imagem é para o olho humano; o dado estruturado é para o agente.

A modelagem deve manter a geometria isolada em uma única coluna, discriminada por `space`, para que adotar coordenada real no futuro seja uma migração de conteúdo e não uma reestruturação.

---

# 23. Pecuária

O sistema deverá possuir uma entidade correspondente a lotes de animais.

Sugestão:

```ts
Herd {
  id

  farmId

  name

  headCount

  category
  description

  currentAreaId
}
```

---

Exemplo:

```text
Lote 01

82 animais

Novilhas

Localização:
Pasto 4
```

---

# 24. Lotes de animais

## RF-47 — Criar lote

O lote poderá ser cadastrado:

- manualmente;
- pelo agente;
- pelo WhatsApp.

---

## RF-48 — Quantidade de cabeças

Cada lote deverá possuir um número de animais.

---

## RF-49 — Categoria

Opcionalmente poderá possuir uma classificação.

Exemplos:

```text
Novilhas

Vacas

Bezerros

Bois
```

---

## RF-50 — Vincular lote a uma área

O lote poderá estar associado a um pasto.

---

# 25. Visualização de animais no mapa

## RF-51 — Informações sobre o polígono

Ao visualizar um pasto no mapa, deverão aparecer informações básicas — os hectares informados e as cabeças contadas no banco.

Exemplo:

```text
Pasto 4

63,5 ha

118 cabeças
```

---

## RF-52 — Detalhes

Ao selecionar o pasto:

```text
Pasto 4

Área:
63,5 ha

Animais:
118

Lotes:
Lote 03
Lote 08
```

---

# 26. Movimentação de lotes

## RF-53 — Movimentar lote manualmente

O usuário deverá conseguir mover um lote entre duas áreas.

Exemplo:

```text
Pasto 3
↓
Pasto 8
```

---

## RF-54 — Movimentar lote pelo agente

Exemplo:

```text
Move o lote das novilhas para o Pasto 7.
```

O agente deverá identificar:

```text
Lote

Origem

Destino

Quantidade de animais
```

e solicitar confirmação.

---

## RF-55 — Movimentar lote pelo WhatsApp

A mesma funcionalidade deverá ser possível pelo WhatsApp.

---

# 27. Histórico de movimentação

A movimentação não deverá ser registrada apenas através da alteração de `currentAreaId`.

Deverá existir histórico.

```ts
HerdMovement {
  id

  herdId

  fromAreaId
  toAreaId

  movedAt

  headCount
}
```

---

Isso permitirá futuramente calcular:

```text
Tempo de ocupação

Tempo de descanso

Histórico de pastagem

Lotação histórica
```

---

# 28. Agricultura

O MVP deverá possuir suporte básico para agricultura.

## RF-56 — Vincular cultura a uma área

Exemplo:

```text
Talhão 4

Soja

Safra 26/27

78 hectares
```

---

## RF-57 — Produção em sacas

O sistema deverá permitir armazenar quantidade em sacas.

Sugestão:

```ts
CropProduction {
  id

  areaId

  crop
  season

  expectedBags
  actualBags
}
```

---

Isso permitirá posteriormente responder:

```text
Quantas sacas produzimos no Talhão 4?
```

```text
Qual foi a produtividade por hectare?
```

---

# 29. Custos associados às áreas

As despesas deverão poder ser associadas às áreas da fazenda.

## RF-58 — Vincular gasto a uma área

Exemplo:

```text
R$ 18.000

Reforma de pastagem

Pasto 4
```

---

## RF-59 — Vincular gasto pelo agente

Exemplo:

```text
Coloca essa despesa no Pasto 4.
```

O agente poderá chamar:

```text
allocateExpenseToArea()
```

---

## RF-60 — Vincular gasto pelo WhatsApp

Exemplo:

```text
Gastei 18 mil reformando o pasto quatro.
```

O agente deverá entender tanto a despesa quanto sua associação à área.

---

# 30. Rateio entre áreas

O modelo deverá suportar uma despesa distribuída entre múltiplas áreas.

Sugestão:

```ts
ExpenseAllocation {
  id

  expenseId
  areaId

  amount

  percentage
}
```

---

Exemplo:

```text
Usuário:

Esse fertilizante foi metade no Talhão 1
e metade no Talhão 2.
```

O sistema registra:

```text
Talhão 1 → 50%

Talhão 2 → 50%
```

---

# 31. Consultas por área

## RF-61 — Consultar custos

Exemplos:

```text
Quanto gastei no Pasto 8?
```

```text
Quanto custou o Talhão 3 nesta safra?
```

---

## RF-62 — Consultar produção

Exemplos:

```text
Quantas sacas saíram do Talhão Norte?
```

---

## RF-63 — Consultar animais

Exemplo:

```text
Quantos animais estão no Pasto 4?
```

---

# 32. Catálogo inicial de tools

## Fazenda

```text
getFarm

updateFarm

updateFarmContext
```

---

## Financeiro

```text
getExpenses

getRevenue

createExpense

createRevenue

updateExpense

updateRevenue

allocateExpenseToArea

getFinancialSummary
```

---

## Áreas

```text
getAreas

getArea

createArea

updateArea

deleteArea
```

O agente poderá administrar dados da área — criar, renomear, classificar, informar hectares, excluir — mas **não desenhar os polígonos**.

O desenho será sempre realizado pelo usuário, no editor sobre a imagem. Não existe tool que receba geometria.

---

## Pecuária

```text
getHerds

getHerd

createHerd

updateHerd

moveHerd

getHerdMovementHistory
```

---

## Agricultura

```text
getCropProduction

createCropProduction

updateCropProduction
```

---

## Mercado

```text
getCommodityQuotes

getCommodityHistory
```

---

# 33. Páginas do MVP

A aplicação deverá possuir poucas páginas.

A principal experiência deverá ocorrer dentro da interface conversacional.

---

## Landing Page

Página pública apresentando o produto.

Conteúdo básico:

```text
Proposta de valor

Benefícios

Demonstração

CTA
```

---

## Login

Autenticação do usuário.

---

## Cadastro

Criação da conta.

---

## Verificação

Confirmação simples da conta.

---

## `/app`

### Agent Workspace

Página principal autenticada.

Deverá iniciar no formato:

```text
O que você quer fazer hoje?

[ Pergunte sobre sua fazenda ]
```

A interface se transforma dinamicamente conforme o agente utiliza Generative UI.

---

## `/app/financeiro`

Área destinada à operação manual.

Deverá permitir:

```text
Visualizar receitas

Visualizar despesas

Criar lançamento

Editar lançamento

Filtrar lançamentos
```

---

## `/app/fazenda`

Página de gestão física da propriedade.

Deverá concentrar:

```text
Mapa

Contorno da propriedade

Pastos

Talhões

Lotes de animais

Informações básicas das áreas
```

---

## `/app/configuracoes`

Deverá conter:

```text
Perfil

Dados da fazenda

WhatsApp

Preferências básicas
```

---

# 34. Fluxo principal do produto

O MVP deverá conseguir executar o seguinte fluxo ponta a ponta.

## Primeiro acesso

```text
Usuário cria conta
↓
Verifica conta
↓
Abre aplicação
↓
Conversa com agente
↓
Informa nome da fazenda
↓
Informa hectares
↓
Informa atividade
↓
Farm é criada
```

---

## Cadastro do mapa

```text
Usuário abre mapa
↓
Envia uma imagem da propriedade
↓
Desenha pastos/talhões sobre a imagem
↓
Nomeia áreas e informa hectares
↓
Vértices são armazenados em 0..1 num jsonb
```

---

## Cadastro de lote

```text
Lote 01

42 novilhas

Pasto 3
```

---

## Operação financeira via WhatsApp

Usuário envia:

```text
Gastei R$ 14.800 de diesel hoje.
```

Agente responde:

```text
Entendi uma despesa de R$ 14.800
em combustível para hoje.

Deseja registrar?
```

Usuário:

```text
Confirmar
```

Sistema executa:

```text
createExpense()
```

---

## Despesa associada a área

Usuário:

```text
Gastei R$ 8.000 reformando o Pasto 3.
```

Sistema cria:

```text
Expense
+
ExpenseAllocation → Pasto 3
```

---

## Consulta

Posteriormente, o usuário acessa a aplicação e pergunta:

```text
Onde estou gastando mais?
```

O agente responde e a UI renderiza:

```text
Gastos — Setembro

Combustível     R$ 48.300

Pastagem        R$ 37.100

Insumos         R$ 31.600
```

---

Usuário:

```text
E onde estou gastando com pastagem?
```

A aplicação renderiza o mapa:

```text
Pasto 3      R$ 21.500

Pasto 8      R$ 15.600
```

---

Usuário:

```text
Quantos animais estão no Pasto 3?
```

Agente:

```text
Existem 82 animais atualmente no Pasto 3.
```

---

Usuário:

```text
Move o lote de novilhas para o Pasto 7.
```

Agente:

```text
Vou movimentar 42 novilhas
do Pasto 3 para o Pasto 7.

Confirma?
```

Usuário:

```text
Confirmar
```

Sistema:

```text
moveHerd()
```

Banco registra:

```text
Herd.currentAreaId

+

HerdMovement
```

Mapa e demais interfaces são atualizados.

---

# 35. Fora do MVP

Os seguintes itens não devem fazer parte do escopo inicial.

```text
Mapa georreferenciado (lat/lng)

Import de KML, KMZ e GeoJSON

Cálculo automático de hectares

Gateway de pagamento

Cobrança de assinatura

NF-e

Integração fiscal completa

Pix

Open Finance

Integração bancária

Contabilidade

LCDPR

Múltiplos usuários por fazenda

Múltiplas fazendas por usuário

Sistema avançado de permissões

Planejamento automático de pastejo

Recomendações agronômicas

Recomendação veterinária

Compra de novas terras

Simulações financeiras avançadas

Gestão de máquinas

Estoque completo de insumos

CRM

Comercialização automática

Execução de compras ou vendas
```

---

# 36. Roadmap posterior ao MVP

Após a validação inicial, poderão ser adicionados módulos como:

## Financeiro avançado

```text
Contas a pagar

Contas a receber

Fluxo de caixa projetado

Orçamento

DRE

Conciliação bancária

Open Finance
```

---

## Fiscal

```text
NF-e

XML

Integração contábil

LCDPR
```

---

## Gestão operacional

```text
Planejamento de pastejo

Capacidade de suporte

Dias de ocupação

Dias de descanso

Manejo sugerido
```

---

## Inteligência financeira

```text
Previsão de caixa

Cenários

Compra de terras

Financiamentos

Arrendamento

Simulações de preço de commodities
```

---

## Agente proativo

Exemplo:

```text
Seu custo com pastagem aumentou 18%
nos últimos 60 dias.

A maior parte do aumento veio dos
Pastos 3 e 8.

Deseja analisar?
```

---

# 37. Tese que o MVP precisa validar

O objetivo principal do MVP não é validar um ERP rural completo.

O MVP precisa validar se o produtor percebe valor neste fluxo:

```text
LINGUAGEM NATURAL
        ↓
AGENTE
        ↓
TOOLS
        ↓
DADOS ESTRUTURADOS
        ↓
REPRESENTAÇÃO DA FAZENDA
        ↓
VISUALIZAÇÃO
        ↓
AÇÃO
```

Mais especificamente:

```text
WhatsApp
+
Chat
+
Financeiro
+
Mapa
+
Dados operacionais
+
Generative UI
```

O resultado esperado é que o produtor consiga interagir com a gestão da propriedade sem precisar navegar continuamente por menus, planilhas ou relatórios.

A aplicação deve transformar perguntas e instruções em consultas, visualizações e ações sobre uma representação estruturada da fazenda.
