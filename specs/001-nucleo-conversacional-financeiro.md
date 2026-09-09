# Núcleo conversacional financeiro

> Fatia 1 do MVP. Specs irmãos (WhatsApp, áreas/mapa, pecuária, cotações) vêm depois — ver Out of Scope.

## Problem Statement

O produtor rural registra e consulta as finanças da propriedade em caderno, planilha ou na cabeça. Software de gestão rural existe, mas exige que ele navegue menus, entenda plano de contas e preencha formulário — trabalho que ele não vai fazer no meio do curral, com a mão suja, no fim de um dia de sol.

O resultado é que ele não sabe onde está gastando. Não porque o dado não existe, mas porque registrar custa mais atenção do que o dado vale no momento em que a despesa acontece. Quando alguém finalmente compila, é meses depois, é incompleto, e não muda decisão nenhuma.

## Solution

Uma aplicação web cuja tela principal não é um dashboard, e sim uma conversa. O produtor fala como falaria com o gerente — "gastei 4.800 de diesel hoje", "quanto entrou esse mês?", "onde estou gastando mais?" — e um agente traduz isso em dados estruturados no banco e em respostas com visualização.

O ganho não é ter os números; é o custo de entrada cair a uma frase. Registrar deixa de ser uma tarefa e vira uma fala.

Esta fatia entrega: conta, onboarding conversacional que cria a fazenda, chat persistente com múltiplas conversas, registro e consulta de receitas e despesas por linguagem natural, visualizações renderizadas pelo agente, e a tela manual de lançamentos para quem prefere formulário.

## User Stories

1. Como produtor, quero criar uma conta com e-mail e senha, para acessar minha fazenda de qualquer lugar.
2. Como produtor, quero verificar meu e-mail antes de usar o sistema, para que ninguém crie conta em meu nome.
3. Como produtor, quero entrar e sair da minha conta, para usar o sistema em um computador compartilhado sem deixar a sessão aberta.
4. Como produtor, quero editar meu nome, e-mail e telefone, para manter meus dados corretos.
5. Como produtor de primeira viagem no sistema, quero que o agente me pergunte sobre a fazenda em vez de me dar um formulário, para começar a usar sem sentir que estou preenchendo cadastro.
6. Como produtor, quero informar nome, hectares, localização e atividade principal conversando, para que o sistema saiba do que estamos falando nas próximas conversas.
7. Como produtor, quero que o agente pare de me perguntar sobre a fazenda depois que eu já respondi, para não repetir informação.
8. Como produtor que prefere formulário, quero editar os dados da fazenda numa tela normal, para não depender do agente para corrigir um número.
9. Como produtor, quero que o agente lembre de coisas qualitativas que eu contei ("trabalhamos com Nelore", "o João é o gerente"), para não repetir contexto toda conversa.
10. Como produtor, quero que a página inicial me pergunte o que eu quero saber, em vez de me mostrar gráficos que eu não pedi, para não ter que interpretar um painel antes de perguntar o que me interessa.
11. Como produtor, quero registrar uma despesa falando uma frase, para não abrir formulário no meio do serviço.
12. Como produtor, quero que o agente entenda "hoje", "ontem" e "semana passada" como datas, para não ter que digitar data.
13. Como produtor, quero que o agente entenda "quatro mil e oitocentos" e "4.8 mil" como valor, para falar como eu falo.
14. Como produtor, quero que o agente classifique a despesa em uma categoria sozinho, para não escolher de uma lista.
15. Como produtor, quero que a descrição guarde minhas palavras ("diesel do trator"), para depois encontrar o lançamento como eu me lembro dele.
16. Como produtor, quero registrar uma receita da mesma forma que registro despesa, para não aprender dois fluxos.
17. Como produtor, quero ver o que o agente entendeu antes de gravar, para corrigir um valor errado antes que vire dado.
18. Como produtor, quero perguntar quanto gastei num período, para saber se o mês está pesado.
19. Como produtor, quero perguntar quanto gastei com um tipo de coisa ("com diesel", "com adubo"), para achar o ralo.
20. Como produtor, quero perguntar quanto entrou no período, para saber se fechei no azul.
21. Como produtor, quero perguntar o resultado do mês, para não fazer a conta na cabeça.
22. Como produtor, quero perguntar onde estou gastando mais, para saber onde mexer primeiro.
23. Como produtor, quero ver um gráfico junto da resposta quando a pergunta pede comparação, para enxergar a tendência em vez de ler números.
24. Como produtor, quero que o gráfico de uma conversa antiga continue mostrando os dados daquela época, para poder reler uma análise sem que ela mude sozinha.
25. Como produtor, quero manter várias conversas separadas, para não misturar a análise da safra com a dúvida de ontem.
26. Como produtor, quero voltar numa conversa anterior e continuar de onde parei, para não recontextualizar tudo.
27. Como produtor, quero que minhas conversas tenham títulos reconhecíveis, para achar a certa na lista.
28. Como produtor, quero ver a resposta do agente aparecendo conforme ele escreve, para saber que o sistema está trabalhando e não travado.
29. Como produtor, quero ver a lista de todos os lançamentos numa tabela, para conferir se está tudo lá.
30. Como produtor, quero filtrar os lançamentos por período, tipo e categoria, para achar o que procuro.
31. Como produtor, quero editar um lançamento que ficou errado, para corrigir sem apagar e refazer.
32. Como produtor, quero excluir um lançamento duplicado, para não contar duas vezes.
33. Como produtor, quero criar um lançamento por formulário quando estou no computador, para não ter que conversar quando já sei exatamente o que quero.
34. Como produtor, quero que o agente me peça confirmação antes de apagar um lançamento, para não perder dado por mal-entendido.
35. Como produtor, quero que o agente diga que não sabe em vez de inventar, para poder confiar nos números que ele me dá.
36. Como produtor, quero que o agente pergunte quando minha frase for ambígua, para não gravar a despesa na categoria errada.
37. Como dono do produto, quero que o agente só acesse dados da fazenda do usuário autenticado, para que uma fazenda nunca veja dados de outra.
38. Como dono do produto, quero que toda despesa e receita registre sua origem (formulário ou agente), para saber quanto do uso é conversacional quando eu for avaliar a tese.

## Implementation Decisions

**Estrutura**

- Monorepo simples: `api/` (NestJS, adaptador Express) e `web/` (React SPA) lado a lado, sem workspace tooling. Sem pacote de contratos compartilhado nesta fatia; os schemas Zod das tools vivem em `api/` e o front declara os tipos das props que consome.
- `docker-compose` para desenvolvimento com Postgres 16 em container. `HOST_URL` como variável de ambiente desde já (o ngrok entra no spec de WhatsApp, mas a variável nasce aqui).
- Postgres puro. PostGIS e qualquer consulta espacial estão fora do MVP inteiro, não só desta fatia.

**Persistência**

- Prisma como ORM. As colunas `jsonb` que carregam estrutura são tipadas por schema Zod e validadas na fronteira do repositório — o `JsonValue` do Prisma não sai da camada de dados.
- `User` e `Farm` são entidades distintas, com `Farm.ownerUserId`. No MVP a relação é 1:1, mas nenhum código pode assumir isso.
- **A `Farm` é criada vazia no signup**, com `onboardingCompleted: false`. Consequência arquitetural deliberada: `farmId` nunca é nulo em nenhuma assinatura de função, query ou guard do sistema.
- `Chat` pertence a `farmId` (não a `userId`). `Message` pertence a `Chat` e grava o `UIMessage.parts` do AI SDK inteiro como `jsonb`.
- Os resultados de tool persistidos são **congelados**. Reabrir uma conversa antiga re-renderiza os componentes com os dados que existiam no momento da pergunta; não há reexecução de tool ao carregar histórico.
- `FarmMapImage` e `FarmArea` existem no schema desde já, com áreas no seed, mas **sem feature nesta fatia** — nada de upload, editor de polígono ou tools de área (ticket 16). O mapa do produto é uma imagem que o produtor sobe, com polígonos em coordenadas relativas à imagem (`0..1`) e `hectares` digitado pelo produtor; não há lat/lng, GeoJSON nem cálculo de área. A coluna `shape` grava o espaço de coordenadas (`"space": "image"`) para que adotar coordenada real depois seja migração de conteúdo, não reestruturação.
- `Expense` **sempre** tem ao menos uma `ExpenseAllocation`. Despesa sem área tem uma allocation com `areaId: null`, e `areaId` é FK real para `FarmArea`. A invariante `SUM(allocations.amount) = expense.amount` é imposta na escrita, não por convenção — toda soma financeira do sistema lê de allocations, de modo que total da fazenda e total por área não podem divergir.
- Categoria de despesa é enum fechado; `description` é texto livre com as palavras do produtor. Consultas do tipo "quanto gastei com diesel" filtram por enum e buscam no texto.
- `source` em todo lançamento (`MANUAL`, `WEB_AGENT`, e os valores de WhatsApp já declarados no enum para a fatia seguinte).

**Auth**

- BetterAuth via `@thallesp/nestjs-better-auth`, adaptador Express.
- `bodyParser: false` no `NestFactory.create()` é obrigatório; onde for necessário corpo bruto, usar `bodyParser.rawBody` nas opções do módulo. Isso precisa ser acertado agora porque o webhook do WhatsApp depende disso na fatia seguinte.
- O guard global protege tudo por padrão; rotas públicas se marcam explicitamente.
- Verificação de e-mail obrigatória antes da conta liberar.
- Em desenvolvimento, SPA e API são same-site em `localhost`. A topologia de subdomínios irmãos com `crossSubDomainCookies` é decisão de dia zero **do primeiro deploy**, não desta fatia — mas nada no código pode assumir mesma origem.

**Agente**

- Loop no servidor com Vercel AI SDK; `useChat` no cliente consumindo stream do endpoint de chat.
- Modelo `gpt-5` no loop principal. O provider do modelo é injetado, não importado direto — é o que permite trocá-lo pelo mock nos testes.
- As tools vivem no servidor e recebem `farmId` do contexto autenticado. **O modelo nunca vê, escolhe nem recebe `farmId` como argumento.** Não existe tool que aceite `farmId` no schema.
- Tools desta fatia: `getFarm`, `updateFarm`, `updateFarmContext`, `createExpense`, `createRevenue`, `updateExpense`, `updateRevenue`, `getExpenses`, `getRevenue`, `getFinancialSummary`.
- **Generative UI híbrida.** Tools de dados são associadas a componentes por convenção no front: a `part` de tool no `UIMessage` determina qual componente renderiza, e o modelo escolhe *ferramenta*, não componente — não há tool que receba nome de componente como argumento. Tools de UI pura existem só para o que não é consequência de uma consulta (formulário manual, card de confirmação).
- O prompt de sistema carrega papel, guardrails, data corrente, e um resumo compacto da fazenda: nome, hectares, atividade, `agentContext`, e `onboardingCompleted`. Hectares por área e contagens vêm por tool, nunca no prompt.
- `agentContext` é markdown reescrito **por inteiro** pelo agente quando ele atualiza, com a versão anterior no input. Nunca append.
- `agentContext` guarda apenas informação qualitativa. Qualquer número que participe de cálculo é dado estruturado — essa é uma regra do prompt e uma regra de revisão de código.

**Guardrails**

- Nível 1 (leitura) executa direto.
- Nível 2 (criação) apresenta o entendimento antes de gravar.
- Nível 3 (destrutivo/operacional) **nunca executa direto**. A tool grava uma `PendingAction` (`id`, `farmId`, `toolName`, `args`, `status`, `expiresAt`) e retorna "aguardando confirmação". A execução só acontece via `resolvePendingAction(id, 'confirm' | 'cancel')`.
- Esta fatia usa `PendingAction` apenas para exclusão de lançamento, mas o mecanismo nasce genérico porque `moveHerd` e `deleteArea` dependem dele, e porque um caminho único de execução torna o guardrail estrutural em vez de convencional.
- Na web, a `PendingAction` pendente renderiza como card de confirmação. O renderizador de botões do WhatsApp consome a mesma tabela na fatia seguinte.

**Páginas**

- `/app` — workspace conversacional. Estado inicial: saudação e um campo de pergunta, sem gráficos.
- `/app/financeiro` — tabela de lançamentos com filtros, criação, edição e exclusão manuais.
- `/app/configuracoes` — perfil e dados da fazenda.
- Landing, login, cadastro e verificação são páginas públicas.

## Testing Decisions

**O que faz um bom teste aqui.** Testes exercitam comportamento observável por quem usa o sistema: dada uma requisição, o que muda no banco e o que volta na resposta. Não se testa que um service chamou um repositório, não se mocka o Prisma, e não se asserta sobre a redação do texto que o modelo gera — texto é não-determinístico e mudar prompt não pode quebrar a suíte.

**Seam única: a requisição HTTP contra a app Nest inicializada, com Postgres real.**

O repositório está vazio, então não há seam anterior a preferir. A escolha é a mais alta possível: subir a aplicação, apontar para um Postgres real com seed, e emitir requisições. O caminho exercitado é o de produção inteiro — guard de auth, resolução de `farmId`, loop do agente, execução de tool, invariante de allocation, `PendingAction`, persistência das `parts`.

A mesma seam serve aos dois níveis, trocando só o provider do modelo:

- **`yarn test` (determinístico, sem token, todo push):** o provider é o `MockLanguageModelV2` do `ai/test`, roteirizado para emitir tool calls específicas. Isso torna determinístico tudo o que deve ser determinístico — se a tool `createExpense` grava allocation com a soma certa, se um usuário de outra fazenda recebe 404, se a exclusão gera `PendingAction` em vez de apagar, se `parts` volta íntegro ao recarregar a conversa.
- **`yarn eval` (não-determinístico, com token, sob demanda):** o mesmo endpoint contra `gpt-5`, com relógio congelado e seed fixo. A asserção muda de resultado para **trajetória** — qual tool foi chamada e com quais argumentos. Falha abaixo de ~90% de acerto e imprime os casos que regrediram. Pipeline separada (ticket #2), disparada manualmente ou quando o diretório do agente muda.

**Sem prior art.** Este é o primeiro código do repositório; a suíte desta fatia é o precedente que as próximas seguem. Vale montar o harness de seed com essa responsabilidade em mente — as fatias de WhatsApp, áreas e pecuária vão reusar a mesma Fazenda Santa Clara.

**Módulos cobertos:** auth e escopo de fazenda, onboarding, CRUD financeiro (agente e manual), agregação financeira, ciclo de `PendingAction`, persistência e recarga de conversa.

## Out of Scope

**Fatias seguintes, cada uma com seu spec:**

- WhatsApp — webhook, identificação de usuário por número, entrada de texto/áudio/imagem, botões de confirmação, verificação de número por OTP entregue no próprio WhatsApp.
- Áreas e mapa (ticket 16, já escrito) — upload da imagem da propriedade, desenho de polígono sobre ela, tools de área, `FarmMap` e `AreaDetails` no catálogo de generative UI, consulta de custo por área. As tabelas já entram nesta fatia; a feature não.
- Pecuária — lotes, movimentação, histórico de movimentação.
- Agricultura — cultura por área, produção em sacas.
- Cotações — provider abstraído, cron de atualização, histórico de preços.

**Fora do MVP inteiro:** PostGIS e qualquer consulta espacial. Mapa georreferenciado, coordenadas lat/lng, import de KML/KMZ/GeoJSON e cálculo automático de hectares. Gateway de pagamento e cobrança. NF-e e integração fiscal. Múltiplos usuários por fazenda e múltiplas fazendas por usuário (o schema comporta, o produto não expõe). Sistema de permissões. Staging. Autoscaling. LLM-as-judge nos evals. Kubernetes.

**Adiado por dependência externa:** deploy de produção (EC2 + RDS + GHCR + SSM + Caddy) está no ticket #1, bloqueado por registro de domínio.

## Further Notes

**A tese que esta fatia precisa validar** não é "o produtor consegue registrar despesa". É que ele **prefere** registrar falando. O sinal a observar no piloto é comportamental: ele volta a registrar sem ser lembrado, na segunda semana. Por isso o `source` em todo lançamento não é telemetria opcional — é o instrumento de medida da hipótese.

**A lista de categorias de despesa** é um chute informado, não um dado de domínio validado. Ela é barata de trocar enquanto não houver lançamentos reais e cara depois (migração de dados). Vale revisar com um produtor antes do primeiro piloto.

**Licenciamento de cotações**, quando a fatia chegar: os dados do CEPEA são CC BY-NC e a política deles proíbe explicitamente "transmissão de séries de preços". Enquanto o MVP for validação sem cobrança, CONAB e agregadores gratuitos com citação de fonte resolvem. No dia em que houver receita, isso vira bloqueio e precisa de autorização formal — decisão que é muito mais barata antes de existir produto pago em cima do dado.

**Verificação da Meta**, quando a fatia de WhatsApp chegar: aprovação de display name e business verification são o caminho crítico e não dependem de código. Disparar cedo. O número de teste (5 destinatários) cobre todo o desenvolvimento sem custo e sem verificação.
