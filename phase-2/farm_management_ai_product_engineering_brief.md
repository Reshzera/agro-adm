# Farm Management AI — Product & Engineering Brief

## 1. Purpose

This document defines the required product scope for the next phase of an AI-powered farm management platform focused initially on:

- Financial management
- Cattle management
- Pasture and paddock management
- Operational alerts and recommendations
- AI-assisted interaction with structured farm data
- A proactive "Today on the Farm" experience
- Weather and commodity market context
- A workspace UI where tables, charts, maps, and financial/cattle data can be manipulated through an AI agent

This is **not** a ticket breakdown yet. It is a functional and technical product brief that should be used to:

1. Inspect the existing codebase
2. Identify what already exists
3. Identify gaps and technical dependencies
4. Propose implementation phases
5. Generate engineering tickets afterward

---

# 2. Current Technical Context

The current application uses:

- **Frontend:** React SPA
- **Backend:** NestJS
- **AI layer:** Vercel AI SDK / AI SDK
- **Agent:** already exists and can interact with backend functionality
- Current agent capabilities include at least basic financial actions such as adding expenses
- Existing agent implementation is incomplete and should be reviewed before extending it

The next implementation should reuse the current architecture where possible rather than introducing unnecessary frameworks.

## Out of scope for this phase

The following should **not** be implemented in this phase unless required as an abstraction boundary:

- WhatsApp integration
- WhatsApp authentication
- WhatsApp message ingestion
- WhatsApp webhook processing
- SMS
- Native mobile apps

However, backend commands and domain services should be designed so that WhatsApp can become another client in the future without duplicating business logic.

---

# 3. Product Principle

The product should not behave like a traditional farm ERP with an AI chat bolted onto it.

The desired model is:

> The farm data is the product.  
> Tables, charts, maps, and operational objects are the primary UI.  
> The AI agent is the easiest way to query and manipulate those objects.

The system should therefore support both:

1. **Direct manipulation**
   - forms
   - tables
   - filters
   - map interactions
   - buttons
   - normal CRUD workflows

2. **Natural-language manipulation**
   - ask questions
   - create records
   - filter data
   - modify views
   - compare periods
   - create charts
   - navigate to entities
   - execute actions after confirmation when needed

The AI should never be the only way to access critical farm data.

---

# 4. UX Architecture

## 4.1 Desktop layout

The recommended desktop experience is:

- Left or right sidebar: AI assistant
- Main workspace: persistent application state

The workspace should display:

- tables
- financial views
- cattle lists
- cattle detail
- charts
- pasture maps
- recommendations
- alerts
- task/action views

The assistant should not endlessly duplicate large tables or graphs inside the conversation.

Instead:

- simple answer -> can remain in chat
- exploratory data -> render in workspace
- complex table -> open/update workspace
- chart request -> create/update chart in workspace
- map request -> navigate/update map workspace

Example:

User:
> Show my cattle expenses for this month.

Agent:
> Total cattle-related expenses this month are R$ 42,480.

Workspace:
- updates to a filtered expense table
- optionally shows a chart

User:
> Split it by category.

Workspace:
- same view updates rather than creating an entirely new artifact in chat

---

## 4.2 AI-controlled workspace state

The application needs an explicit concept of **workspace state**.

The agent should be able to request UI operations such as:

- open page
- open entity
- set filters
- update date range
- change grouping
- create chart
- change chart type
- show table
- show map
- select paddock
- select cattle group
- compare periods

These UI actions should be represented as structured tool outputs or UI commands, not inferred from prose.

Possible conceptual command model:

```ts
type WorkspaceCommand =
  | { type: 'navigate'; destination: string; params?: Record<string, unknown> }
  | { type: 'set_filters'; target: string; filters: Record<string, unknown> }
  | { type: 'show_table'; dataset: string; columns?: string[]; filters?: Record<string, unknown> }
  | { type: 'show_chart'; dataset: string; chartType: string; groupBy?: string; filters?: Record<string, unknown> }
  | { type: 'open_entity'; entityType: string; entityId: string }
  | { type: 'show_map'; focus?: string; entityIds?: string[] };
```

The implementation does not need to use this exact shape. The code agent should inspect the existing AI SDK architecture and propose the cleanest compatible approach.

---

# 5. Core Domain Model

The next phase should establish clear domain boundaries.

Recommended main domains:

- Farm
- FarmArea / Property
- Paddock
- Cattle
- CattleGroup / Lot
- CattleMovement
- Weighing
- HealthEvent
- ReproductiveEvent
- FinancialTransaction
- FinancialCategory
- CostCenter
- InventoryItem
- InventoryMovement
- Document
- Task
- Alert
- Recommendation
- WeatherObservation / Forecast
- MarketPrice
- User
- Role
- AuditLog

The codebase should avoid placing all domain behavior inside generic agent tools.

AI tools should call domain/application services.

---

# 6. Mandatory Phase Features

These are the capabilities considered necessary for the product to become a coherent initial farm-management system.

---

# 6.1 Financial Management

The current financial feature should be reviewed and normalized.

Required capabilities:

## Transactions

Support:

- income
- expense
- transfer if multiple accounts exist

Transaction fields should support at minimum:

- id
- farmId
- type
- amount
- transaction date
- due date
- paid date
- description
- category
- cost center
- supplier/customer
- status
- source
- notes
- attachments
- createdBy
- createdAt
- updatedAt

Recommended statuses:

- pending
- paid
- overdue
- cancelled

## Financial categories

Examples:

- cattle purchase
- feed
- mineral supplement
- medication
- vaccines
- fuel
- machinery maintenance
- labor
- pasture
- fencing
- rent
- utilities
- taxes
- cattle sales
- crop sales
- miscellaneous

Categories should be configurable.

## Cost centers

The same transaction should be allocatable where appropriate to:

- entire farm
- specific property
- paddock
- cattle group
- machinery/equipment
- activity/business unit

This is critical for later profitability analysis.

## Financial views

Provide:

- cash flow
- expenses by category
- income by category
- monthly comparison
- accounts payable
- accounts receivable
- overdue transactions
- period comparison
- basic P&L / DRE-style report

## Agent capabilities

The agent must be able to:

- create expense
- create income
- edit transaction
- cancel transaction
- search transactions
- answer totals
- compare periods
- group expenses
- identify largest expenses
- identify overdue payments
- open related data in the workspace

High-risk/destructive actions should require confirmation.

---

# 6.2 Cattle Management

The platform needs cattle-level and group-level management.

Not every farm will operate with individual animal records, so both modes should be possible.

## Individual cattle

Recommended fields:

- id
- farmId
- visual tag
- RFID/electronic identifier
- sex
- breed
- birth date
- origin
- acquisition date
- acquisition cost
- current status
- current paddock
- current group
- current estimated/current measured weight
- sire/dam where applicable
- notes

Recommended statuses:

- active
- sold
- deceased
- transferred
- missing

## Cattle groups / lots

Fields:

- id
- farmId
- name
- purpose
- animal count
- category
- current paddock
- start date
- notes

Potential categories:

- calves
- heifers
- cows
- bulls
- steers
- finishing cattle

## Movements

Every movement between paddocks should create a historical event.

Required:

- from paddock
- to paddock
- timestamp
- animal(s) or group
- user/source
- reason
- notes

Do not simply overwrite `currentPaddockId` without preserving history.

## Agent examples

The system should support queries/actions such as:

- "How many cattle are in North Pasture?"
- "Move lot 12 to Paddock 4."
- "Which animals are currently unassigned to a paddock?"
- "How long has lot 8 been in this paddock?"
- "Show all cattle movements this month."
- "Which group gained the most weight?"

---

# 6.3 Pasture Map and Paddock Registration

This is a core feature and should receive first-class product treatment.

## Base map

The user should be able to:

- open the farm on a map/satellite view
- define the farm boundary if needed
- draw paddock polygons manually
- edit polygon vertices
- rename paddocks
- assign metadata
- delete/archive paddocks

The initial version does not need sophisticated GIS tooling.

Required geometry support:

- polygon
- area calculation
- centroid if useful

Potential technical implementation:

- Mapbox
- MapLibre
- Google Maps
- another GIS-compatible map provider

The code agent should inspect licensing, current frontend dependencies, expected cost, satellite imagery quality in Brazil, and offline implications before recommending one.

## Image-based pasture import

The product concept includes:

> User uploads an image/map of the property and selects paddocks.

The MVP can support:

1. upload an image or screenshot
2. render it in a map-style editor
3. allow user to manually draw polygon areas
4. register each selected/drawn area as a paddock

Automatic AI segmentation of paddocks should be treated as an enhancement, not a hard MVP requirement unless technically easy and accurate enough.

If implementing automatic detection later:

- AI should suggest boundaries
- user must review/edit
- system must never silently create authoritative geospatial boundaries from AI output

## Paddock data

Each paddock should support:

- id
- farmId
- name
- polygon
- area
- usable area
- forage type
- current cattle/group
- planned capacity
- current stocking rate
- entry date
- planned exit date
- last exit date
- rest days
- notes
- active/inactive status

Future-friendly fields may include:

- water source
- soil characteristics
- pasture condition
- biomass estimate
- satellite vegetation index

---

# 6.4 Paddock Occupancy and Rotation

The system should know:

- what cattle are currently in each paddock
- how many animals
- estimated live weight
- how long they have been there
- previous occupancy
- rest time since last grazing

At minimum, rotation rules should initially support configurable thresholds:

- max grazing days
- minimum rest days
- maximum animal count
- optional target stocking density

The first version should avoid pretending to have agronomic intelligence it does not have.

Recommendations should state the basis.

Example:

> Lot 7 has been in Paddock 4 for 11 days.  
> Your configured maximum grazing period for this paddock is 10 days.

This is better than:

> You must move the cattle now.

unless there is adequate domain data to justify that recommendation.

---

# 6.5 Alerts and Recommendations

Alerts are deterministic.

Recommendations may involve logic or AI.

These should remain conceptually separate.

## Alert examples

- account due tomorrow
- overdue payment
- vaccination due
- cattle group exceeded configured paddock duration
- paddock rest period completed
- inventory below minimum
- cattle record missing required data

## Recommendation examples

- consider moving group to another eligible paddock
- consider delaying movement because selected paddock has not rested enough
- projected feed inventory will run out before the next scheduled purchase
- selling a cattle group now vs later has a meaningful financial difference
- weather may affect planned operations

## Recommendation object

Recommendations should be persisted rather than generated as ephemeral chat text.

Suggested fields:

- id
- farmId
- type
- severity
- title
- explanation
- evidence/context
- suggested action
- createdAt
- expiresAt
- status
- acceptedAt
- dismissedAt

Statuses:

- new
- seen
- accepted
- dismissed
- expired

This enables the "Today on the Farm" experience.

---

# 6.6 Today on the Farm

This should be treated as one of the primary home experiences.

The user should not need to decide which module to inspect first.

The system should surface:

> What requires attention today?

## Sections

Recommended:

### Requires attention

High-priority items:

- overdue payment
- paddock rotation issue
- critical stock
- animal health event
- inconsistency/error
- weather-related operational risk

### Coming up

Examples:

- payment due in 3 days
- cattle health task
- planned paddock movement
- stock expected to run out
- expected cattle sale window

### Insights

Examples:

- feed expense +18% vs previous month
- cattle group below weight gain target
- cattle price increased this week
- rainfall forecast may improve pasture recovery

## Interaction

Every card must be actionable.

Bad:

> "Mineral stock is low."

Better:

> Mineral stock is estimated to last 6 more days.

Actions:

- View inventory
- Register purchase
- Dismiss

The user should be able to ask the agent:

> Why am I seeing this?

The agent must be able to explain the data used.

---

# 7. High-Priority Differentiators

These features should not necessarily all be implemented immediately, but the architecture should not block them.

---

# 7.1 Multimodal Farm Inbox

Goal:

> Reduce manual data entry.

The system should eventually accept:

- image
- PDF
- receipt
- invoice
- voice
- free text

For this phase, build the domain abstraction even if ingestion is initially limited.

Suggested workflow:

1. User uploads document/image
2. AI extracts candidate structured information
3. System creates a **draft**
4. User reviews changes
5. User confirms
6. Domain records are created

Never create high-impact financial data directly from uncertain extraction without review.

Examples:

- invoice -> expense + inventory movements
- receipt -> expense
- cattle document -> cattle record metadata
- weight sheet -> weight events

---

# 7.2 Proactive Data Quality / Anomaly Detection

The system should eventually detect inconsistencies such as:

- duplicate expenses
- duplicate invoice number
- impossible cattle movement
- animal marked deceased but later weighed
- paddock with negative/incorrect animal count
- mismatched inventory
- suspicious expense change
- unassigned cattle
- stale records

Initial implementation can use deterministic validation rules.

LLM-based anomaly interpretation can be layered on later.

The agent should explain:

- what appears inconsistent
- which records are involved
- confidence
- suggested correction

Never silently fix records.

---

# 7.3 Economic Digital Twin

The long-term differentiator should connect operational cattle data to economics.

Per animal or cattle group, the system should eventually derive:

- acquisition cost
- feed/supplement cost
- health cost
- allocated pasture cost
- labor allocation where feasible
- total accumulated cost
- current estimated weight
- expected sale value
- margin
- break-even price
- break-even weight

This enables queries such as:

- Which group is most profitable?
- Which animals are currently below break-even?
- What happens if I sell this group today?
- What happens if I hold for 45 days?
- How much is this group costing per day?

The first phase does not need perfect cost accounting, but the data model must support cost allocation to cattle/groups.

---

# 7.4 Farm Knowledge / Operational Memory

The system should eventually allow the owner to store operational knowledge.

Examples:

- standard vaccination process
- paddock-specific instructions
- supplier preferences
- recurring procedures
- equipment maintenance instructions
- seasonal practices

The AI agent should later use this information as farm-specific context.

This should be modeled as structured or searchable farm knowledge, not only conversation history.

---

# 8. Weather Integration

Weather should be implemented as **operational context**, not simply a weather widget.

Required initial capabilities:

- current conditions
- multi-day forecast
- rainfall forecast
- temperature
- wind
- humidity if available

Each farm/property should have coordinates used to retrieve weather data.

## Product integration

Weather should be visible on Today on the Farm.

Examples:

- Heavy rainfall expected tomorrow
- Heat risk this afternoon
- Strong wind may affect planned spraying
- Rain expected before planned cattle movement

In future phases, weather should inform:

- pasture recovery
- operational tasks
- cattle heat stress
- irrigation
- crop activity
- stocking/rotation recommendations

## Architecture

Weather provider integration must be isolated behind a domain/service interface.

Example:

```ts
interface WeatherProvider {
  getCurrent(location: Coordinates): Promise<CurrentWeather>;
  getForecast(location: Coordinates, days: number): Promise<WeatherForecast>;
}
```

This prevents provider lock-in.

---

# 9. Commodity and Market Prices

The system should support relevant market indicators, initially focused on Brazil.

Candidates:

- fed cattle / boi gordo
- calf
- soybean
- corn
- USD/BRL

Potential sources should be evaluated for:

- licensing
- API availability
- update frequency
- geographic relevance
- historical data
- commercial redistribution rights

Do not scrape websites in production if licensing is unclear.

## Product principle

Displaying a commodity quote alone is not the main differentiator.

The goal is to connect external prices to the user's operation.

Examples:

> Current cattle price implies an estimated value of R$ X for Lot 12.

> Corn price increased 9% over the last 30 days. Based on your current consumption, projected feed cost increases by R$ Y/month.

> If Lot 9 is sold at the current market reference price, estimated gross revenue is R$ X.

Market prices should therefore eventually feed:

- valuation
- sale simulations
- forecast cash flow
- margin projections

---

# 10. Inventory Management

Inventory should be planned now because it interacts strongly with finance and cattle operations.

Support:

- products
- units
- current quantity
- minimum stock
- average cost
- supplier
- location
- expiry date where relevant

Inventory categories may include:

- feed
- mineral supplements
- medicines
- vaccines
- fuel
- fencing materials
- agricultural inputs

## Inventory movements

Required:

- purchase
- consumption
- adjustment
- transfer
- loss

Consumption should eventually be assignable to:

- cattle group
- paddock
- equipment
- farm activity

This feeds the cost model.

## Future proactive behavior

Examples:

- stock below minimum
- projected stockout
- expired medication
- purchase recommendation

---

# 11. Health and Reproduction

This should be at least represented in the cattle domain even if the first UI is simple.

Health events:

- vaccination
- medication
- diagnosis
- treatment
- disease
- injury
- death

Reproductive events:

- breeding
- insemination
- pregnancy diagnosis
- calving
- abortion
- weaning

Every event should preserve:

- animal/group
- date
- type
- product/procedure
- dosage if applicable
- responsible user
- notes

Future alerting:

- vaccine due
- booster due
- expected calving
- missed reproduction event

---

# 12. Weight and Performance Tracking

Support weighing events:

- individual or group
- date
- weight
- source
- device/manual
- notes

Derived metrics:

- average daily gain (ADG / GMD)
- group average
- weight trend
- days since last weighing

AI queries:

- Which lot has the best ADG?
- Which cattle are below target?
- Compare Lot 4 vs Lot 7.
- Show weight gain for the last 90 days.

---

# 13. User Roles, Permissions, and Audit Log

This is mandatory before the system supports real multi-user farm operations.

Suggested roles:

- Owner
- Manager
- Farm worker
- Accountant
- Veterinarian
- Consultant
- Read-only user

Do not hard-code authorization solely around role names.

Use permissions/capabilities.

Examples:

- finance.read
- finance.write
- finance.approve
- cattle.read
- cattle.write
- health.write
- pasture.write
- users.manage

## Audit

Important mutations should generate audit events.

Audit fields:

- actor
- action
- entity
- entityId
- previous values where appropriate
- new values
- timestamp
- source
- agent/human origin

The platform must clearly distinguish:

- direct user action
- AI-proposed action
- AI-executed confirmed action
- automated system action

---

# 14. Confirmation and AI Safety UX

The agent should have different action levels.

## Level 1 — read only

No confirmation:

- search
- summarize
- calculate
- open page
- filter table
- create chart

## Level 2 — low-impact write

May execute immediately depending on product settings:

- add note
- create task
- save view

## Level 3 — business record modification

Require explicit confirmation unless the user action itself already clearly confirmed it.

Examples:

- create financial transaction
- edit transaction
- move cattle
- update cattle status
- change inventory

## Level 4 — destructive/high-impact

Always require confirmation:

- delete/cancel transaction
- delete cattle record
- bulk edits
- bulk movement
- permanent data deletion

The agent must display what will change before executing.

Example:

> Move 132 animals from North Pasture to Paddock 4?

- 132 animals affected
- North Pasture current count: 220
- Paddock 4 current count: 45

[Confirm] [Cancel]

---

# 15. AI Tool Architecture

The existing agent implementation must be audited.

Goals:

- tools should be strongly typed
- tools should map to application use cases
- agent should not directly perform raw database access
- tool inputs must be validated
- authorization must happen server-side
- farm/tenant scope must be enforced server-side
- mutations must be auditable
- tool outputs should be structured

Example layers:

```text
AI Agent
  ↓
AI Tools
  ↓
Application Services / Use Cases
  ↓
Domain Services
  ↓
Repositories / External Integrations
```

Avoid:

```text
AI Agent
  ↓
Direct Prisma/ORM queries
```

The same application services should later be reusable by:

- React SPA
- AI agent
- WhatsApp integration
- future mobile app
- external API

---

# 16. Agent Context

The agent should understand at minimum:

- authenticated user
- selected farm
- user permissions
- currently open workspace/page
- selected entities
- current filters/date range

It should not receive the entire farm database in the prompt.

Instead, retrieve only necessary information through tools.

The system should use structured context wherever possible.

---

# 17. AI Response Design

The agent should prefer concise responses tied to UI actions.

Bad:

> I have analyzed your financial data and found several interesting insights. Based on my analysis, your expenses in the selected period...

Better:

> Feed expenses were R$ 48,200 this month, up 17% from last month.

Workspace:
- chart updates
- filtered table opens

The agent should support follow-up references:

User:
> Show feed expenses.

Then:
> Now only for North Farm.

Then:
> Compare with last year.

Conversation state must correctly preserve what "it", "that", "those animals", and "this paddock" refer to when safe to do so.

---

# 18. Saved Views / Farm Workspace

The user should eventually be able to save useful analyses.

Examples:

- Monthly cattle costs
- Lot performance
- Accounts due this week
- Paddock occupancy
- Sales projection

A saved view stores:

- dataset
- filters
- grouping
- visualization
- date rules
- title

The AI should be able to create and update saved views.

Example:

> Save this as "Monthly Feed Cost".

---

# 19. Charts and Tables

Tables should support:

- sorting
- filtering
- pagination or virtualization
- column visibility
- export
- row selection
- row drill-down

Charts should support useful domain visualizations:

- expenses over time
- expenses by category
- income vs expenses
- cattle weight trend
- ADG by group
- cattle count by paddock
- stock levels
- commodity price trends

Charts should be generated from deterministic query results.

The LLM should decide presentation, not fabricate numbers.

---

# 20. Offline Strategy

Offline is important for farm usage.

The React SPA should be evaluated for PWA/offline capabilities.

Priority offline workflows:

- cattle lookup
- cattle movement
- health event
- weighing
- paddock movement
- task completion
- basic inventory consumption

Full finance and analytics do not necessarily need complete offline capability initially.

The system needs:

- local queue
- sync
- conflict strategy
- visible sync state
- retry behavior
- idempotency

Never hide synchronization failures.

UI should show:

- synced
- pending sync
- sync failed

Offline support is technically significant and should be planned as its own implementation phase.

---

# 21. Data Portability

Users must be able to export their own data.

Minimum:

- financial CSV/XLSX
- cattle CSV/XLSX
- movements CSV
- health events CSV
- paddock data export
- PDF reports where useful

This reduces lock-in anxiety and increases trust.

Future:

- complete farm archive export
- public API

---

# 22. Search

Implement global search across relevant farm entities.

Search should find:

- animal tag
- cattle group
- paddock
- transaction
- supplier
- customer
- document
- task

The AI agent may use the same search infrastructure.

---

# 23. Documents and Attachments

Records should support attachments.

Examples:

- invoice
- receipt
- cattle purchase document
- health certificate
- lab result
- pasture image
- contract

Store metadata:

- file name
- type
- linked entity
- uploaded by
- created at

Future OCR/extraction should operate on these documents.

---

# 24. Notification Center

The application should have an in-app notification center.

Categories:

- finance
- cattle
- pasture
- inventory
- weather
- task
- system
- recommendation

Users should be able to:

- mark read
- dismiss
- open related object
- control notification preferences

Push notification support may be added later.

WhatsApp delivery is out of scope for this phase.

---

# 25. Task Management

Basic tasks are valuable because recommendations must turn into work.

Task fields:

- title
- description
- farm
- related entity
- assignee
- due date
- priority
- status
- createdBy
- source

Sources:

- manual
- agent
- alert
- recommendation
- recurring rule

Examples:

- Move Lot 7 to South Paddock
- Vaccinate calves
- Buy mineral supplement
- Pay supplier invoice
- Inspect water trough

---

# 26. Basic Farm Dashboard Metrics

Even with Today on the Farm as the main home experience, provide high-level farm metrics.

Potential cards:

Financial:
- cash balance / modeled position
- income this month
- expense this month
- accounts due

Cattle:
- total active cattle
- cattle by category
- cattle sold
- mortality

Pasture:
- occupied paddocks
- resting paddocks
- rotation alerts

Performance:
- average ADG
- average cost/head
- projected cattle value

Avoid overwhelming the user with too many KPIs.

---

# 27. Possible Later Features

These should remain out of immediate scope but should be considered architecturally.

## Bank/Open Finance integration

Potential capabilities:

- transaction import
- reconciliation
- account balances
- automatic matching with invoices

## NF-e integration

- import XML
- parse supplier/items
- create financial transaction
- update inventory

## RFID and scales

Integrations with:

- RFID readers
- electronic scales
- cattle handling hardware

## Machinery management

- machines
- hour meter
- maintenance schedule
- fuel
- operating cost

## Compliance / traceability

- SISBOV-related workflows
- traceability records
- document completeness
- animal movement compliance

## Satellite pasture intelligence

- NDVI
- pasture vigor
- biomass estimation
- recovery prediction

## Advanced grazing recommendation engine

Inputs could eventually include:

- paddock area
- forage type
- historical occupancy
- rainfall
- biomass
- live weight
- stocking density
- seasonality

This should not initially be delegated entirely to an LLM.

Use agronomic algorithms/rules/models and have the LLM explain their outputs.

---

# 28. Event-Driven Farm Core and Deterministic Rule Engine

The **My Farm / Today on the Farm** experience should be powered primarily by deterministic domain events and rules.

The AI agent must **not** be the component that decides whether a business condition is true.

The target model is:

```text
User / Agent / API / Future WhatsApp
                │
                ▼
             Command
                │
                ▼
         Command Handler
                │
       ┌────────┴────────┐
       ▼                 ▼
 Domain validation    Persistence
       │                 │
       └────────┬────────┘
                ▼
          Domain Event
                │
                ▼
       Event Handlers / Sagas
                │
        ┌───────┼─────────────┐
        ▼       ▼             ▼
      Rules   Projections   Integrations
        │       │             │
        └───────┼─────────────┘
                ▼
         Rule Evaluations
                │
                ▼
 Alerts / Recommendations / Tasks
                │
                ▼
        Today on the Farm
                │
                ▼
         AI Explanation Layer
```

The LLM may:

- interpret user intent
- select a command/query/tool
- summarize deterministic results
- explain why a rule triggered
- propose an action
- ask for confirmation

The LLM must not be responsible for:

- computing authoritative balances
- deciding whether inventory is below threshold
- deciding whether a payment is overdue
- deciding whether a paddock exceeded configured grazing duration
- deciding whether rainfall exceeded a configured threshold
- determining whether an animal movement is structurally valid
- computing current cattle-group value from weight × reference price
- deciding whether an event is duplicate
- modifying records without passing normal validation

---

## 28.1 NestJS Architecture Direction

For this domain, prefer NestJS CQRS concepts over a large generic service layer.

Recommended primitives:

- `Command`
- `CommandBus`
- `@CommandHandler()`
- `Query`
- `QueryBus`
- `@QueryHandler()`
- Domain Event
- `EventBus`
- `@EventsHandler()`
- `Saga` for long-running or multi-step asynchronous workflows

Use regular NestJS providers for:

- repositories
- domain policies
- rule evaluators
- external provider clients
- clocks
- id generators
- transaction managers

The architecture should remain pragmatic.

Do **not** introduce CQRS merely to create additional files around trivial CRUD operations.

Use commands when an operation represents a meaningful business action.

Good:

```text
MoveCattleGroup
RecordExpense
ReceiveInventory
ConsumeInventory
RecordWeight
RegisterRainfallObservation
UpdateMarketPrice
CompleteTask
```

Less useful:

```text
UpdateCattleRow
UpdatePaddockRow
SetField
```

Business terminology should drive commands.

---

## 28.2 Important Distinction: Event-Driven Architecture vs Full Event Sourcing

The initial system should be **event-driven**, but does not need to be fully event-sourced.

Recommended initial approach:

### Current state tables

Keep normalized operational tables such as:

```text
cattle
cattle_groups
paddocks
paddock_occupancies
financial_transactions
inventory_items
inventory_movements
tasks
alerts
recommendations
```

These remain efficient sources for current application state.

### Append-only event ledger

Additionally persist important domain events to an append-only table.

Example:

```text
domain_events
```

This event ledger provides:

- auditability
- debugging
- traceability
- downstream rule execution
- future analytics
- replay of selected projections where appropriate

Do not require the entire farm state to be reconstructed from event history in the initial version.

Full event sourcing should only be adopted later if a concrete requirement justifies its operational complexity.

---

## 28.3 Domain Event Envelope

Every persisted business event should use a common envelope.

Suggested structure:

```ts
interface DomainEventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;

  occurredAt: string;
  recordedAt: string;

  tenantId: string;
  farmId: string;

  aggregateType: string;
  aggregateId: string;

  actor: {
    type: 'user' | 'agent' | 'system' | 'integration';
    id?: string;
  };

  correlationId: string;
  causationId?: string;

  source:
    | 'web'
    | 'agent'
    | 'system'
    | 'import'
    | 'integration'
    | 'future_whatsapp';

  payload: TPayload;
  metadata?: Record<string, unknown>;
}
```

Important fields:

### `eventId`

Globally unique identifier.

### `correlationId`

Connects every event/check/action produced by the same business workflow.

Example:

```text
MoveCattleGroupCommand
  correlationId = abc

CattleMovementValidated
  correlationId = abc

CattleGroupMoved
  correlationId = abc

PaddockOccupancyStarted
  correlationId = abc

RuleEvaluated × N
  correlationId = abc
```

This should make a complete operation inspectable.

### `causationId`

Identifies the previous event/command that caused the current event.

Useful for explaining chains of consequences.

---

# 28.4 Event Storage

Recommended tables:

## `domain_events`

Suggested fields:

```text
id
event_type
event_version
aggregate_type
aggregate_id
farm_id
tenant_id
actor_type
actor_id
source
correlation_id
causation_id
payload_json
metadata_json
occurred_at
recorded_at
```

This table should be append-only at application level.

Existing events should never be silently rewritten.

If historical meaning changes, introduce:

- corrected event
- compensating event
- new event version

---

# 28.5 Transactional Outbox

Do not rely solely on in-memory event publication for business-critical downstream processing.

A successful mutation and the fact that its event needs processing should be committed atomically.

Recommended model:

```text
Database transaction:
  1. mutate operational state
  2. insert domain event
  3. insert outbox record
COMMIT
```

Then:

```text
Outbox processor
  ↓
publish event
  ↓
handlers execute
  ↓
mark outbox item processed
```

This avoids:

```text
DB commit succeeds
event publication fails
system silently misses rules/alerts
```

Important properties:

- at-least-once delivery
- idempotent handlers
- retry strategy
- dead-letter/error visibility
- observable processing state

The first version may use the existing application database rather than introducing Kafka/RabbitMQ.

Do not introduce distributed infrastructure until throughput or deployment requirements justify it.

---

# 28.6 Rule Engine

Rules should be deterministic units.

Recommended contract:

```ts
interface FarmRule<TContext = unknown> {
  ruleId: string;
  ruleVersion: number;

  supports(event: DomainEventEnvelope): boolean;

  evaluate(context: TContext): Promise<RuleEvaluationResult>;
}
```

Suggested result:

```ts
interface RuleEvaluationResult {
  ruleId: string;
  ruleVersion: number;

  status:
    | 'passed'
    | 'failed'
    | 'triggered'
    | 'not_applicable'
    | 'insufficient_data'
    | 'error';

  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';

  facts: Record<string, unknown>;

  messageCode?: string;

  suggestedAction?: {
    actionType: string;
    params?: Record<string, unknown>;
  };
}
```

Do not persist only natural-language explanations.

Persist facts.

Example:

```json
{
  "ruleId": "paddock.max_grazing_days",
  "ruleVersion": 1,
  "status": "triggered",
  "severity": "medium",
  "facts": {
    "paddockId": "p_4",
    "groupId": "lot_12",
    "daysOccupied": 11,
    "configuredMaximumDays": 10
  }
}
```

The UI or AI can later render:

> Lot 12 has been in Paddock 4 for 11 days, while the configured maximum is 10.

The authoritative decision remains the structured result.

---

# 28.7 Rule Evaluation Ledger

Create a persisted history of every relevant rule evaluation.

Recommended table:

```text
rule_evaluations
```

Suggested fields:

```text
id
farm_id
trigger_event_id
correlation_id
rule_id
rule_version
status
severity
facts_json
suggested_action_json
evaluated_at
duration_ms
error_code
```

This enables questions such as:

- Why did this alert appear?
- Which checks ran after cattle were moved?
- Which rules passed?
- Which rule blocked the operation?
- Which rules could not run due to missing data?
- Which version of the rule made this decision?

This table is critical for support and trust.

---

# 28.8 Three Kinds of Rules

Distinguish three categories.

## A. Blocking invariants

These must pass **before** the command is committed.

Examples:

- source paddock exists
- destination paddock exists
- source and destination differ
- cattle group belongs to the farm
- user has permission
- animal is active
- movement count is valid
- financial transaction amount is positive

Failure means:

```text
command rejected
```

These rules should normally execute synchronously inside the command flow.

---

## B. Post-event deterministic rules

These evaluate consequences after the operation succeeds.

Examples:

- destination paddock exceeds planned capacity
- lot exceeded grazing period
- inventory fell below minimum
- account becomes overdue
- rainfall threshold crossed
- commodity price changed beyond threshold

Failure/trigger does not roll back the original event.

It creates:

- alert
- recommendation
- task
- projection update

---

## C. Advisory/model-based rules

These may use forecasts or models but must still expose deterministic inputs.

Examples:

- projected mineral stockout
- projected cattle sale value
- expected paddock recovery
- projected cash-flow deficit

These should produce:

```text
value + assumptions + model/rule version
```

Not unexplained AI prose.

---

# 28.9 Example: Cattle Movement Workflow

Command:

```text
MoveCattleGroupCommand
```

Input:

```ts
{
  farmId,
  groupId,
  fromPaddockId,
  toPaddockId,
  effectiveAt,
  reason?
}
```

## Synchronous preconditions

Run:

### `movement.group_exists`

Check:

```text
cattle group exists
```

### `movement.same_farm`

Check:

```text
group and paddocks belong to the same farm
```

### `movement.source_matches_current_location`

Check:

```text
group's current paddock == fromPaddock
```

### `movement.destination_is_different`

Check:

```text
from != to
```

### `movement.destination_active`

Check:

```text
destination paddock is active
```

### `movement.permission`

Check:

```text
actor can perform cattle movements
```

Possible additional blocking rule:

### `movement.destination_hard_capacity`

If the farm has configured a true hard capacity:

```text
projected animals/live weight <= hard capacity
```

Otherwise capacity should be advisory, not blocking.

---

## Commit

Inside one transaction:

```text
close previous paddock occupancy
create cattle movement
open new paddock occupancy
update current group location
persist CattleGroupMoved event
persist outbox item
```

---

## Post-event checks

`CattleGroupMoved` should trigger checks such as:

### `paddock.soft_capacity`

Facts:

```text
current animal count
current estimated live weight
paddock area
configured capacity
```

### `paddock.rest_period`

Check whether destination had enough configured rest time.

Important:

The movement may already have happened in real life.

Therefore this should usually alert rather than reject historical registration.

### `paddock.stocking_density`

Calculate:

```text
live weight / usable hectares
```

or the farm-configured metric.

### `rotation.previous_paddock_rest_started`

Create/update:

```text
previous paddock rest cycle
```

### `rotation.destination_grazing_timer_started`

Calculate:

```text
expected review/exit date
```

### `inventory.expected_consumption_context_changed`

If supplements are tracked per paddock/group, recompute the relevant consumption projection.

Every evaluation should be written to `rule_evaluations`.

---

# 28.10 Example: Inventory Rules

Events that may trigger inventory rules:

```text
InventoryReceived
InventoryConsumed
InventoryAdjusted
CattleGroupMoved
CattleGroupSizeChanged
PurchaseCancelled
```

## Rule: minimum stock

`inventory.minimum_stock`

```text
if onHand <= configuredMinimum
  trigger
```

Persist facts:

```json
{
  "itemId": "...",
  "onHand": 8,
  "minimum": 10,
  "unit": "bag"
}
```

---

## Rule: projected stockout

`inventory.projected_stockout`

Inputs:

```text
current stock
historical consumption rate
configured expected consumption
group size
known planned consumption
supplier lead time
```

Deterministic first version:

```text
dailyConsumption =
  rollingConsumption(last N days)

daysRemaining =
  onHand / dailyConsumption
```

Trigger when:

```text
daysRemaining <= supplierLeadTimeDays + safetyDays
```

Facts must store:

```text
calculated consumption rate
window used
current quantity
lead time
safety period
estimated stockout date
```

Do not let the LLM estimate these values.

---

## Rule: impossible negative inventory

`inventory.negative_stock`

This should normally be blocking unless the farm explicitly allows negative stock.

---

## Rule: expiring medicine

`inventory.expiration_warning`

Trigger at configurable thresholds, e.g.:

```text
30 days
7 days
expired
```

---

# 28.11 Weather and Rain Rules

External weather data should enter the domain as events rather than being read ad hoc by the AI.

Examples:

```text
WeatherForecastUpdated
RainfallObserved
WeatherAlertReceived
```

Normalize provider-specific data before rules run.

Example normalized event:

```ts
{
  farmId,
  propertyId,
  periodStart,
  periodEnd,
  precipitationMm,
  precipitationProbability,
  minTemperatureC,
  maxTemperatureC,
  maxWindKph,
  humidityPercent?,
  provider,
  providerIssuedAt
}
```

---

## Rule: heavy rain forecast

`weather.heavy_rain_forecast`

Configurable threshold:

```text
rainfall >= X mm within Y hours
```

Possible consequence:

- Today on the Farm alert
- affected planned tasks
- optional pasture recommendation context

Facts:

```text
forecast rainfall
forecast window
threshold
provider timestamp
```

---

## Rule: strong wind

`weather.strong_wind`

Can affect future crop-operation features.

Input:

```text
maxWindKph
farm configured limit
```

---

## Rule: cattle heat stress warning

Start conservatively.

A future deterministic model could use:

```text
temperature
humidity
THI formula
```

The rule should use an explicitly defined formula/version.

Do not ask the LLM whether the cattle are under heat stress.

---

## Rule: paddock recovery context

Weather should initially **inform**, not autonomously decide, pasture recovery.

For example:

```text
RainfallObserved
  ↓
update rainfall accumulation projection
  ↓
re-evaluate paddock recovery advisory
```

Initial deterministic inputs may include:

```text
days resting
rainfall accumulated during rest
configured minimum rest days
```

Do not claim pasture biomass or readiness without appropriate measurements/model inputs.

---

# 28.12 Market Price Rules

Market prices should also enter through normalized domain events.

Examples:

```text
MarketPriceUpdated
```

Normalized payload:

```ts
{
  instrument: 'fed_cattle' | 'calf' | 'soybean' | 'corn' | 'usd_brl';
  region?: string;
  value: number;
  unit: string;
  currency: string;
  referenceDate: string;
  provider: string;
}
```

---

## Rule: significant market move

`market.significant_price_move`

Example:

```text
abs(currentPrice / comparisonPrice - 1)
  >= configuredThreshold
```

Comparison windows could be:

- 1 day
- 7 days
- 30 days

Store exact facts.

---

## Rule: cattle group indicative value

`market.cattle_group_indicative_value`

Inputs:

```text
group estimated live weight
yield/arroba conversion assumptions
market reference price
region
```

Output:

```text
indicative gross value
```

The rule must persist the assumptions used.

Never present this as an actual sale offer.

---

## Rule: sale opportunity threshold

User-configurable example:

```text
alert me when estimated gross value of Lot 12 >= R$ X
```

or:

```text
alert me when reference cattle price >= R$ X/@
```

This can be deterministic.

---

## Rule: feed cost pressure

Example:

```text
corn price increases by >= X%
AND
farm has feed-linked inventory/cost model
```

Then recompute projected feed cost using deterministic formulas.

The AI may explain the impact afterward.

---

# 28.13 Financial Rules

Events:

```text
FinancialTransactionCreated
FinancialTransactionUpdated
FinancialTransactionPaid
FinancialTransactionCancelled
ClockDayChanged / ScheduledEvaluationTriggered
```

Some rules are time-triggered rather than event-triggered by a human action.

---

## Rule: overdue transaction

`finance.transaction_overdue`

```text
status == pending
AND dueDate < businessDate
```

---

## Rule: due soon

`finance.transaction_due_soon`

Configurable:

```text
due within N days
```

---

## Rule: possible duplicate expense

`finance.possible_duplicate`

Deterministic first version can compare:

```text
farm
type
supplier
amount
invoice number
date tolerance
```

This should create a warning, not automatically remove anything.

---

## Rule: expense variance

`finance.category_variance`

Example:

```text
current 30-day category spend
vs previous comparable period
```

Trigger if:

```text
increase >= configured threshold
AND absolute difference >= minimum amount
```

Using both relative and absolute thresholds prevents noisy alerts.

---

# 28.14 Paddock Rotation Rules

Core deterministic rules:

## `rotation.max_grazing_days`

```text
current occupancy days >
configured max grazing days
```

## `rotation.minimum_rest_days`

When evaluating an intended destination:

```text
rest days <
configured minimum rest days
```

## `rotation.review_due`

Instead of forcing a move:

```text
occupancy duration >= review interval
```

This may be a better default for farms whose rotation is not purely time-based.

## `rotation.max_animals`

```text
current group animal count >
configured paddock max animals
```

## `rotation.max_live_weight_per_area`

```text
estimated total live weight / usable area >
configured threshold
```

All thresholds must be configurable.

The system must never pretend that a generic threshold is agronomically correct for every farm.

---

# 28.15 Cattle Data Integrity Rules

Examples:

## `cattle.deceased_has_future_activity`

Trigger if:

```text
animal.status == deceased
AND later weighing/movement/health event exists
```

## `cattle.sold_has_future_activity`

Same concept for sold animals.

## `cattle.multiple_active_paddocks`

An animal/group should not have multiple current occupancy records unless the domain explicitly supports it.

## `cattle.group_count_mismatch`

If individual animals are attached to a group:

```text
declared group count != count(active animals assigned)
```

Depending on operating mode, this may be:

- informational
- blocking
- not applicable

## `cattle.weight_outlier`

A deterministic first version may compare against:

```text
previous weight
elapsed days
configured plausible gain/loss boundaries
```

Flag for review rather than silently modifying.

---

# 28.16 Scheduled Rules

Not every rule has a natural domain event.

Introduce an application-level scheduler that emits events such as:

```text
DailyFarmEvaluationRequested
HourlyExternalDataRefreshRequested
WeeklyFarmSummaryRequested
```

Then normal event/rule infrastructure handles the work.

Avoid writing separate cron logic that directly mutates alerts.

Example:

```text
DailyFarmEvaluationRequested
  ↓
OverdueFinancialRule
InventoryStockoutProjectionRule
PaddockDurationRule
UpcomingHealthTasksRule
  ↓
RuleEvaluations
  ↓
Today on the Farm projection
```

This keeps scheduled and real-time evaluations consistent.

---

# 28.17 Today on the Farm as a Projection

"Today on the Farm" should not be generated from scratch by an LLM every time the user opens the page.

It should be a deterministic read model/projection.

Possible table:

```text
farm_attention_items
```

Fields:

```text
id
farm_id
source_type
source_id
rule_evaluation_id
category
severity
title_code
facts_json
suggested_action_json
status
first_seen_at
last_seen_at
resolved_at
expires_at
```

Sources may include:

- rule evaluation
- alert
- recommendation
- task
- external warning

The UI queries this projection.

The AI agent may then explain individual items.

Example:

```text
UI:
"Lot 8 needs rotation review."

User:
"Why?"

Agent calls:
GetAttentionItemExplanationQuery

Deterministic result:
- 12 occupancy days
- configured review period: 10 days
- last movement date
- paddock
- triggering rule version

LLM:
explains these facts in natural language
```

---

# 28.18 Rule Lifecycle

Rules will evolve.

Every rule requires:

```text
ruleId
ruleVersion
description
owner/domain
input schema
triggering event types
output schema
severity policy
test cases
```

Changing logic should usually increment `ruleVersion`.

Example:

```text
inventory.projected_stockout:v1
inventory.projected_stockout:v2
```

Historical evaluations retain their original version.

This makes past recommendations explainable.

---

# 28.19 Rule Configuration

Rules should separate:

```text
logic
```

from:

```text
farm-specific threshold/configuration
```

Example:

Rule:

```text
rotation.max_grazing_days
```

Farm config:

```json
{
  "paddockId": "p_4",
  "maxGrazingDays": 10
}
```

Recommended configuration hierarchy:

```text
system default
  ↓
farm default
  ↓
property override
  ↓
paddock/group/item override
```

The resolved configuration should be persisted in the evaluation facts when important.

This ensures an old rule result remains explainable even after configuration changes.

---

# 28.20 Rule Configuration UX

Do not expose a generic technical rule engine to farmers.

The UI should frame settings in domain language.

Bad:

```text
Configure rule:
rotation.max_grazing_days
operator >
value 10
```

Better:

```text
Paddock 4

Review cattle after:
[ 10 ] days of grazing

Minimum rest before reuse:
[ 25 ] days

Notify:
[ Owner ]
```

Advanced configuration can exist later.

---

# 28.21 AI Interaction with Rules

The agent should use explicit rule-related tools/queries.

Examples:

```text
getAttentionItems()
getRuleEvaluation(id)
getFarmRuleConfiguration(ruleId, scope)
updateFarmRuleConfiguration(...)
getEventTimeline(...)
```

Example conversation:

User:

> Why are you telling me to move Lot 12?

Agent retrieves rule evaluation.

Agent:

> Lot 12 has been in Paddock 4 for 11 days. Your farm setting asks for a rotation review after 10 days. The paddock had 29 days of rest before this occupation.

This is acceptable.

Not acceptable:

> Based on my analysis, I think the cattle should probably be moved.

without explicit deterministic evidence.

---

# 28.22 Agent Commands Must Enter Through the Same Domain Path

The agent must not bypass domain behavior.

Example:

User:

> Move lot 12 to Paddock 4.

Correct:

```text
AI interprets intent
  ↓
MoveCattleGroup tool
  ↓
CommandBus.execute(MoveCattleGroupCommand)
  ↓
normal invariants
  ↓
normal persistence
  ↓
normal domain event
  ↓
normal rules
```

Incorrect:

```text
AI tool
  ↓
repository.update({ currentPaddockId: ... })
```

The same should apply to:

- web UI
- imports
- future WhatsApp
- API integrations

Every mutation should enter through a business command/use case.

---

# 28.23 Event Timeline as a User-Facing Feature

The event ledger can become useful UX.

For a cattle group:

```text
Lot 12

Sep 11 08:42
Moved from Paddock 2 → Paddock 4
By João

Checks:
✓ destination active
✓ 31 days of previous rest
⚠ projected stocking level at 92% of configured target

Sep 09
Weight recorded
Average: 438 kg
```

For a financial transaction:

```text
Invoice imported
Expense proposed
Expense confirmed
Inventory received
Payment reconciled
```

This can improve trust significantly.

---

# 28.24 Explainability API

Create a query path specifically for explaining system decisions.

Concept:

```text
GetDecisionExplanationQuery
```

Input:

```text
attentionItemId
ruleEvaluationId
eventId
```

Output:

```ts
{
  decisionType,
  ruleId,
  ruleVersion,
  status,
  facts,
  sourceEvents,
  configurationUsed,
  suggestedAction
}
```

The frontend can render a deterministic explanation even if the AI is unavailable.

The LLM can optionally transform this into conversational language.

---

# 28.25 Rule Testing Requirements

Every deterministic rule must have automated tests.

At minimum:

### Happy path

Condition not triggered.

### Trigger path

Condition triggered.

### Boundary

Exactly at threshold.

### Missing data

Correctly emits:

```text
insufficient_data
```

instead of making assumptions.

### Wrong tenant/farm scope

Must never read cross-tenant data.

### Version behavior

Historical versions remain stable if required.

Critical rules should also have integration tests covering:

```text
event → handler → rule evaluation → attention item
```

---

# 28.26 Observability

Track:

```text
events emitted
events processed
event processing latency
event handler failures
rule evaluations
rule trigger rate
rule errors
insufficient-data rate
outbox backlog
outbox retries
dead-letter items
attention items created
attention items resolved
```

Use `correlationId` as a primary debugging dimension.

A support engineer should be able to inspect:

> Why did farm X receive this alert?

and reconstruct the full deterministic chain.

---

# 28.27 Initial Rule Catalog

The first implementation does not need dozens of rules.

Start with a compact, high-value catalog.

## Cattle movement

```text
movement.group_exists
movement.same_farm
movement.source_matches_current_location
movement.destination_is_different
movement.destination_active
movement.permission
paddock.soft_capacity
paddock.rest_period
rotation.review_due
```

## Inventory

```text
inventory.minimum_stock
inventory.negative_stock
inventory.projected_stockout
inventory.expiration_warning
```

## Finance

```text
finance.transaction_overdue
finance.transaction_due_soon
finance.possible_duplicate
finance.category_variance
```

## Weather

```text
weather.heavy_rain_forecast
weather.strong_wind
```

## Market

```text
market.significant_price_move
market.cattle_group_indicative_value
```

## Cattle integrity

```text
cattle.deceased_has_future_activity
cattle.sold_has_future_activity
cattle.multiple_active_paddocks
cattle.group_count_mismatch
```

This is sufficient to validate the architecture before expanding the catalog.

---

# 28.28 Example End-to-End Scenario

Farmer says:

> Move Lot 12 to Paddock 4.

## Step 1 — AI

AI identifies:

```text
intent = MoveCattleGroup
```

No business decision is made by AI.

## Step 2 — preview

Backend evaluates command preconditions.

Returns:

```text
132 animals
Paddock 2 → Paddock 4
effective now

Warnings:
Paddock 4 will reach 92% of configured stocking target.
```

## Step 3 — confirmation

User confirms.

## Step 4 — command

```text
MoveCattleGroupCommand
```

executes.

## Step 5 — persistence

Transaction writes:

```text
movement
occupancy changes
current location
domain event
outbox record
```

## Step 6 — event processing

`CattleGroupMoved` triggers:

```text
PaddockCapacityRule
PaddockRestRule
RotationReviewScheduler
AttentionProjection
AuditProjection
```

## Step 7 — rule ledger

Each evaluation is saved.

## Step 8 — UI

Workspace map updates.

Today on the Farm may show:

> Lot 12 is now in Paddock 4.

If an advisory threshold triggered:

> Stocking level is near your configured target.

## Step 9 — explanation

If user asks:

> Why?

The agent reads the deterministic evaluation and explains it.

This is the core architectural pattern to replicate across the platform.

---

# 28.29 Recommended NestJS Module Shape

Conceptually:

```text
modules/
  cattle/
    commands/
    queries/
    events/
    handlers/
    rules/
    domain/
    persistence/

  pasture/
    commands/
    queries/
    events/
    handlers/
    rules/
    domain/
    persistence/

  inventory/
    commands/
    queries/
    events/
    handlers/
    rules/
    domain/
    persistence/

  finance/
    commands/
    queries/
    events/
    handlers/
    rules/
    domain/
    persistence/

  weather/
    events/
    handlers/
    rules/
    providers/

  market/
    events/
    handlers/
    rules/
    providers/

  farm-attention/
    projections/
    queries/
    handlers/

  event-ledger/
  rule-engine/
  outbox/
```

Do not enforce this folder structure blindly.

The code agent should adapt it to existing repository conventions.

The important architectural boundary is:

```text
intent
→ command
→ deterministic domain behavior
→ event
→ deterministic rules
→ projection/action
→ optional AI explanation
```

---

# 28.30 Sagas: When to Use Them

NestJS Sagas can be useful when one event starts a business process involving multiple asynchronous commands.

Use them selectively.

Good future example:

```text
InvoiceConfirmed
  ↓
CreateExpense
  ↓
ReceiveInventory
  ↓
SchedulePayment
```

Another:

```text
CattleSaleConfirmed
  ↓
MarkAnimalsSold
  ↓
ClosePaddockOccupancy
  ↓
CreateIncomeReceivable
  ↓
UpdateInventory/valuation projections
```

Do not use a Saga for simple event listeners where a normal event handler is enough.

---

# 28.31 EventEmitter vs CQRS EventBus

NestJS also provides `@nestjs/event-emitter`.

It is useful for lightweight application decoupling.

For the business-critical farm workflow described here, prefer the explicit CQRS/event model because the system needs:

- typed business commands
- query separation
- traceable event flows
- handlers
- possible sagas
- rule evaluation integration

`EventEmitter` may still be useful for non-domain internal concerns.

Avoid having two competing domain-event mechanisms without a clear reason.

---

# 28.32 What Should Be Deterministic vs AI-Assisted

## Deterministic

- balances
- totals
- due dates
- stock quantity
- cattle count
- occupancy duration
- rest duration
- configured thresholds
- movement validation
- duplicate heuristics
- commodity percentage movement
- indicative cattle valuation formula
- rainfall thresholds
- weather threshold alerts
- ADG calculation
- cost allocations
- cash-flow arithmetic
- rule status

## AI-assisted

- interpreting natural language
- extracting data from an image/document into a draft
- suggesting classification
- generating human-readable explanations
- summarizing multiple alerts
- prioritization suggestions where deterministic priority is insufficient
- answering open-ended questions using retrieved structured facts

## Never AI-only

Any operation that:

- changes authoritative financial data
- moves cattle
- alters inventory
- changes animal status
- changes rule configuration
- creates/deletes authoritative records

must go through deterministic domain validation.

---

# 28.33 Architecture Validation Milestone

Before implementing advanced AI or external integrations, prove the architecture with one vertical slice:

```text
Move cattle group
  ↓
CommandHandler
  ↓
Blocking validation
  ↓
Transaction
  ↓
Domain event + outbox
  ↓
Event processing
  ↓
3–5 deterministic rules
  ↓
Rule evaluation ledger
  ↓
Today on the Farm projection
  ↓
Agent explains result
```

Success criteria:

- one correlation ID traces the entire operation
- replaying event delivery does not duplicate effects
- rules are individually testable
- no LLM is required to determine rule outcome
- UI can explain triggered checks without LLM
- AI agent uses exactly the same command path as the normal UI

Only after this vertical slice is stable should the same architecture be expanded to:

- inventory
- finance
- weather
- market prices
- health
- reproduction
- machinery

# 29. Initial Implementation Priority

The code agent should inspect the existing system and propose an implementation plan approximately around these priorities.

## Phase A — Foundation

- audit current agent architecture
- normalize financial domain
- define farm/tenant boundaries
- define cattle domain
- define paddock domain
- permissions
- audit log
- introduce CQRS selectively for meaningful business commands/queries
- define domain-event envelope
- implement append-only event ledger
- implement transactional outbox
- implement deterministic rule-engine contract
- implement rule-evaluation ledger
- define correlation/causation tracing
- structured AI tool architecture using the same command/query paths as the normal UI

## Phase B — Core Farm Operations

- cattle CRUD
- cattle groups
- paddock CRUD
- map editor
- cattle movements
- paddock occupancy
- financial improvements
- basic tasks
- notifications

## Phase C — AI Workspace

- assistant sidebar
- workspace command protocol
- agent navigation
- agent filters
- tables
- charts
- map manipulation
- safe mutations
- confirmation UX

## Phase D — Today on the Farm

- deterministic farm-attention projection
- initial rule catalog
- scheduled evaluation events
- alert engine
- recommendation persistence
- rule configuration
- rule-version support
- explanation queries backed by rule facts
- home feed
- actions from cards
- event/rule timeline for support and user trust

## Phase E — External Intelligence

- weather provider
- commodity price provider
- market price history
- weather alerts
- market-related insights

## Phase F — Operational Depth

- inventory
- cattle health
- reproduction
- weighing
- ADG
- cost allocation
- economic cattle/group view

## Phase G — Differentiators

- multimodal inbox
- document extraction
- anomaly detection
- projected cash flow
- sale simulator
- proactive economic insights

## Phase H — Offline

- PWA/offline architecture
- local writes
- sync queue
- conflict handling
- operational offline workflows

---

# 30. What the Code Agent Should Produce

Before writing implementation code, the code agent should inspect the repository and produce:

## 1. Existing architecture assessment

Document:

- frontend structure
- backend modules
- database models
- auth approach
- tenant/farm scoping
- AI SDK usage
- current AI tools
- existing financial logic
- API conventions
- state management
- UI component system

## 2. Gap analysis

For every feature in this brief classify:

- already exists
- partially exists
- missing
- blocked by architectural issue
- unclear

## 3. Proposed domain model changes

Include:

- entities
- relationships
- migrations
- indexes
- audit concerns

## 4. Proposed AI architecture

Explain:

- server-side agent organization
- tool registration
- tool validation
- permissions
- confirmations
- UI command transport
- React handling

## 5. Proposed event/rule architecture

The code agent must propose how the existing NestJS project should implement:

- `@nestjs/cqrs` adoption
- commands and command handlers
- queries and query handlers
- domain events and event handlers
- selective use of Sagas
- event envelope
- event ledger schema
- transactional outbox
- retry/idempotency strategy
- rule evaluator registry
- rule evaluation persistence
- correlation/causation IDs
- scheduled evaluation events
- Today on the Farm projection
- explainability query API

It must explicitly identify which current services should remain simple providers and which business operations should become Commands.

It should **not** recommend full event sourcing unless repository inspection reveals a strong concrete reason.

It should propose one complete vertical slice first:

```text
MoveCattleGroup
→ CommandHandler
→ validation
→ transaction
→ event/outbox
→ handlers
→ rules
→ rule ledger
→ farm-attention projection
→ agent explanation
```

## 6. Proposed map architecture

Evaluate:

- map provider
- polygon editing library
- storage format
- GeoJSON/PostGIS requirement
- cost
- satellite layer availability
- performance

Do not introduce PostGIS unless the expected geospatial queries justify the complexity. Basic polygon storage may be sufficient initially.

## 7. Implementation sequence

Create a dependency-aware implementation plan.

Do not create hundreds of microtickets immediately.

First propose epics/workstreams and sequencing.

## 8. Risks

Identify:

- architectural debt
- security/tenant isolation
- AI mutation safety
- offline complexity
- map/provider costs
- market data licensing
- weather licensing
- data migrations
- performance risks

---

# 31. Engineering Quality Requirements

The implementation should prioritize correctness because the product handles financial and operational farm data.

Required:

- server-side validation
- strict tenant isolation
- authorization checks
- idempotency for important mutations
- transactional DB operations where needed
- audit logging
- deterministic calculations
- automated tests for domain rules

LLMs must not perform financial calculations if the same calculation can be performed deterministically in code.

Preferred model:

```text
LLM:
"What does the user want?"

Code:
"Retrieve and calculate the correct result."

LLM:
"Explain the result clearly."
```

Not:

```text
LLM:
"Guess the result from raw text."
```

---

# 32. Product Metrics to Instrument

Add analytics so UX decisions can later be data-driven.

Useful events:

- expense_created
- income_created
- cattle_created
- cattle_moved
- paddock_created
- agent_message_sent
- agent_tool_called
- agent_action_confirmed
- agent_action_cancelled
- recommendation_opened
- recommendation_accepted
- recommendation_dismissed
- alert_opened
- dashboard_viewed
- today_farm_viewed
- table_filtered
- saved_view_created

Track:

- time to complete common tasks
- agent success rate
- tool failure rate
- confirmation cancellation rate
- manual vs AI-generated actions
- feature retention

Avoid storing sensitive free-text prompts in analytics systems without a clear privacy policy.

---

# 33. Key UX Principle: Progressive Complexity

The platform should work for at least two user profiles:

## Simple user

Wants:

- "How much did I spend?"
- "How many cattle are there?"
- "What do I need to do today?"

Should not need to understand:

- custom reports
- SQL-like filters
- formulas
- advanced analytics

## Advanced user

Wants:

- detailed tables
- cost allocations
- exports
- custom filtering
- comparison
- auditing
- advanced herd analysis

The same product should support both using progressive disclosure.

Do not expose all complexity by default.

---

# 34. Key Product Differentiation Hypothesis

The competitive advantage should **not** be:

> "We have more modules than existing cattle software."

The working hypothesis should be:

> "The platform requires dramatically less administrative work to maintain accurate farm data, and turns farm events into decisions automatically."

That means prioritizing:

1. low-friction data capture
2. automation
3. connected domains
4. proactive recommendations
5. explainability
6. direct action

Example:

User records:

> "Moved 132 cattle to Paddock 4."

The system should eventually update:

- group location
- paddock occupancy
- movement history
- grazing timer
- stocking data
- future rotation alert
- Today on the Farm

One user action should generate all relevant downstream state.

---

# 35. Non-Goals for the Immediate Phase

Do not attempt to build all of the following simultaneously:

- full accounting software
- ERP replacement
- advanced agronomic model
- autonomous livestock decision maker
- satellite computer vision platform
- custom weather model
- commodity trading system
- full machinery ERP
- complete SISBOV automation
- native iOS/Android apps
- WhatsApp integration

The next phase should create a strong domain foundation and a compelling operational loop.

---

# 36. Recommended MVP Product Loop

The first strong end-to-end loop should be:

1. User registers farm
2. User registers/draws paddocks
3. User creates cattle groups
4. User assigns cattle groups to paddocks
5. User registers financial transactions
6. System maintains occupancy history
7. System identifies upcoming grazing/financial issues
8. Today on the Farm shows actionable items
9. User can ask the agent about the farm
10. Agent can update workspace views
11. Agent can execute safe backend actions after confirmation
12. User can inspect all underlying records manually

If this loop is excellent, the product already demonstrates the broader vision without requiring every planned module.

---

# 37. Open Product Decisions

The code agent should flag these rather than assuming answers if they materially affect architecture.

Questions to resolve during implementation planning:

1. Is the primary tenancy model:
   - one user = one farm
   - one organization = many farms
   - one organization = many properties inside a farm
   - another hierarchy?

2. Does cattle management start primarily with:
   - individual animals
   - cattle groups/lots
   - both equally?

3. Is the initial target:
   - beef cattle
   - dairy
   - both?

4. Does "farm map" need:
   - true georeferenced GIS polygons
   - image-overlay/manual drawing only
   - both?

5. Is there an existing database/ORM choice that should be preserved?

6. Is the current agent:
   - server-side AI SDK
   - client-side orchestrated
   - mixed?

7. How is authentication currently implemented?

8. What user roles already exist?

9. Are farms already modeled as tenants?

10. What financial entities already exist?

11. Is there already a component library/design system?

12. Does the current SPA have a state management approach suitable for agent-driven workspace commands?

13. Is PWA/offline already partially configured?

14. Is file storage already available?

15. Is there an existing job/queue system for scheduled alerts?

These questions should be answered through codebase inspection wherever possible before asking the product owner.

---

# 38. Final Direction

The system should evolve toward three layers:

```text
                  AI AGENT
       Query · Explain · Execute · Recommend
                       │
                       ▼
               FARM OPERATING MODEL
 Finance · Cattle · Pasture · Inventory · Tasks
                       │
                       ▼
             EXTERNAL INTELLIGENCE
 Weather · Markets · Documents · Devices
```

The UI should expose this model through:

```text
Assistant Sidebar
        +
Persistent Farm Workspace
        +
Today on the Farm
```

The next engineering phase should prioritize the correctness and interoperability of the core farm model before maximizing the number of features.

The product should ultimately feel less like:

> "software where the farmer fills out records"

and more like:

> "a system that understands what is happening on the farm, keeps the records coherent, and tells the owner what deserves attention next."
