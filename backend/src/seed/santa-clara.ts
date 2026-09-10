import {
  EntrySource,
  ExpenseCategory,
  FarmAreaType,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

export const SEED_CLOCK = new Date('2026-03-16T09:00:00.000Z');

export const SEED_IDS = {
  users: {
    joao: 'seed-user-joao',
    marina: 'seed-user-marina',
  },
  farms: {
    santaClara: 'seed-farm-santa-clara',
    boaVista: 'seed-farm-boa-vista',
  },
  mapImages: {
    santaClara: 'seed-map-santa-clara',
  },
  areas: {
    pasto4: 'seed-area-pasto-4',
    talhao1: 'seed-area-talhao-1',
    talhao2: 'seed-area-talhao-2',
    sede: 'seed-area-sede',
    boaVistaPasto1: 'seed-area-bv-pasto-1',
  },
  expenses: {
    diesel: 'seed-expense-diesel',
    reformaPasto4: 'seed-expense-reforma-pasto-4',
    aduboRateado: 'seed-expense-adubo-rateado',
    salarios: 'seed-expense-salarios',
    vacina: 'seed-expense-vacina',
    boaVistaDiesel: 'seed-expense-bv-diesel',
  },
  revenues: {
    boiGordo: 'seed-revenue-boi-gordo',
    milho: 'seed-revenue-milho',
    bezerros: 'seed-revenue-bezerros',
  },
  chats: {
    primeiraConversa: 'seed-chat-primeira-conversa',
  },
} as const;

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function shape(points: [number, number][]): Prisma.InputJsonValue {
  return { space: 'image', version: 1, points };
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.expenseAllocation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.pendingAction.deleteMany();
  await prisma.farmArea.deleteMany();
  await prisma.farmMapImage.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedSantaClara(prisma: PrismaClient): Promise<void> {
  await prisma.user.create({
    data: {
      id: SEED_IDS.users.joao,
      name: 'João Pereira',
      email: 'joao@santaclara.test',
      emailVerified: true,
      phone: '+5567999990001',
    },
  });

  await prisma.farm.create({
    data: {
      id: SEED_IDS.farms.santaClara,
      ownerUserId: SEED_IDS.users.joao,
      name: 'Fazenda Santa Clara',
      totalAreaHa: '840.00',
      primaryActivity: 'Pecuária de corte',
      location: 'Camapuã, MS',
      mainCrops: 'Milho safrinha',
      approximateAnimalCount: 920,
      onboardingCompleted: true,
      agentContext: [
        '# Fazenda Santa Clara',
        '',
        '- Pecuária de corte é a atividade principal; trabalham com Nelore.',
        '- Também plantam milho safrinha em dois talhões.',
        '- João é o gerente da propriedade e quem fala com o sistema.',
        '- O gado sai para o frigorífico de Campo Grande.',
      ].join('\n'),
    },
  });

  await prisma.farmMapImage.create({
    data: {
      id: SEED_IDS.mapImages.santaClara,
      farmId: SEED_IDS.farms.santaClara,
      storageKey: 'seed/santa-clara/mapa.png',
      widthPx: 1600,
      heightPx: 1200,
      uploadedAt: SEED_CLOCK,
    },
  });

  await prisma.farmArea.createMany({
    data: [
      {
        id: SEED_IDS.areas.pasto4,
        farmId: SEED_IDS.farms.santaClara,
        mapImageId: SEED_IDS.mapImages.santaClara,
        name: 'Pasto 4',
        type: FarmAreaType.PASTURE,
        hectares: '63.50',
        shape: shape([
          [0.12, 0.18],
          [0.34, 0.15],
          [0.38, 0.36],
          [0.15, 0.4],
        ]),
      },
      {
        id: SEED_IDS.areas.talhao1,
        farmId: SEED_IDS.farms.santaClara,
        mapImageId: SEED_IDS.mapImages.santaClara,
        name: 'Talhão 1',
        type: FarmAreaType.CROP_FIELD,
        hectares: '120.00',
        shape: shape([
          [0.45, 0.2],
          [0.68, 0.22],
          [0.66, 0.44],
          [0.44, 0.42],
        ]),
      },
      {
        id: SEED_IDS.areas.talhao2,
        farmId: SEED_IDS.farms.santaClara,
        mapImageId: SEED_IDS.mapImages.santaClara,
        name: 'Talhão 2',
        type: FarmAreaType.CROP_FIELD,
        hectares: '95.00',
        shape: shape([
          [0.7, 0.24],
          [0.9, 0.26],
          [0.88, 0.5],
          [0.68, 0.47],
        ]),
      },
      {
        id: SEED_IDS.areas.sede,
        farmId: SEED_IDS.farms.santaClara,
        name: 'Sede',
        type: FarmAreaType.OTHER,
      },
    ],
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.diesel,
      farmId: SEED_IDS.farms.santaClara,
      amount: '4800.00',
      date: day('2026-03-10'),
      description: 'Diesel do trator',
      category: ExpenseCategory.FUEL,
      source: EntrySource.WEB_AGENT,
      allocations: {
        create: [{ areaId: null, amount: '4800.00' }],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.reformaPasto4,
      farmId: SEED_IDS.farms.santaClara,
      amount: '18000.00',
      date: day('2026-03-04'),
      description: 'Reforma do pasto 4',
      category: ExpenseCategory.PASTURE_AND_CROP_WORK,
      source: EntrySource.WEB_AGENT,
      allocations: {
        create: [{ areaId: SEED_IDS.areas.pasto4, amount: '18000.00' }],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.aduboRateado,
      farmId: SEED_IDS.farms.santaClara,
      amount: '24000.00',
      date: day('2026-03-02'),
      description: 'Adubo para o milho, metade em cada talhão',
      category: ExpenseCategory.FERTILIZER_AND_SEED,
      source: EntrySource.MANUAL,
      allocations: {
        create: [
          { areaId: SEED_IDS.areas.talhao1, amount: '12000.00' },
          { areaId: SEED_IDS.areas.talhao2, amount: '12000.00' },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.salarios,
      farmId: SEED_IDS.farms.santaClara,
      amount: '9200.00',
      date: day('2026-02-28'),
      description: 'Salários dos dois funcionários',
      category: ExpenseCategory.LABOR,
      source: EntrySource.MANUAL,
      allocations: {
        create: [{ areaId: null, amount: '9200.00' }],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.vacina,
      farmId: SEED_IDS.farms.santaClara,
      amount: '3150.00',
      date: day('2026-02-01'),
      description: 'Vacina de aftosa do rebanho',
      category: ExpenseCategory.ANIMAL_HEALTH,
      source: EntrySource.WHATSAPP_TEXT,
      allocations: {
        create: [{ areaId: SEED_IDS.areas.pasto4, amount: '3150.00' }],
      },
    },
  });

  await prisma.revenue.createMany({
    data: [
      {
        id: SEED_IDS.revenues.boiGordo,
        farmId: SEED_IDS.farms.santaClara,
        amount: '86400.00',
        date: day('2026-03-06'),
        description: 'Venda de 24 bois gordos para o frigorífico',
        source: EntrySource.WEB_AGENT,
      },
      {
        id: SEED_IDS.revenues.milho,
        farmId: SEED_IDS.farms.santaClara,
        amount: '31500.00',
        date: day('2026-03-12'),
        description: 'Venda de milho, 450 sacas',
        source: EntrySource.MANUAL,
      },
      {
        id: SEED_IDS.revenues.bezerros,
        farmId: SEED_IDS.farms.santaClara,
        amount: '42000.00',
        date: day('2026-02-14'),
        description: 'Venda de bezerros desmamados',
        source: EntrySource.MANUAL,
      },
    ],
  });

  await prisma.chat.create({
    data: {
      id: SEED_IDS.chats.primeiraConversa,
      farmId: SEED_IDS.farms.santaClara,
      title: 'Gastos de março',
      createdAt: day('2026-03-10'),
      updatedAt: day('2026-03-10'),
      messages: {
        create: [
          {
            id: 'seed-message-1',
            role: 'user',
            parts: [{ type: 'text', text: 'quanto gastei esse mês?' }],
            createdAt: new Date('2026-03-10T14:00:00.000Z'),
          },
          {
            id: 'seed-message-2',
            role: 'assistant',
            parts: [
              { type: 'step-start' },
              {
                type: 'tool-getFinancialSummary',
                toolCallId: 'seed-tool-call-1',
                state: 'output-available',
                input: { from: '2026-03-01', to: '2026-03-31' },
                output: {
                  totalExpenses: 46800,
                  totalRevenues: 117900,
                  result: 71100,
                },
              },
              {
                type: 'text',
                text: 'Em março você gastou R$ 46.800 e recebeu R$ 117.900.',
              },
            ],
            createdAt: new Date('2026-03-10T14:00:04.000Z'),
          },
        ],
      },
    },
  });

  await prisma.user.create({
    data: {
      id: SEED_IDS.users.marina,
      name: 'Marina Alves',
      email: 'marina@boavista.test',
      emailVerified: true,
      phone: '+5567999990002',
    },
  });

  await prisma.farm.create({
    data: {
      id: SEED_IDS.farms.boaVista,
      ownerUserId: SEED_IDS.users.marina,
      name: 'Fazenda Boa Vista',
      totalAreaHa: '310.00',
      primaryActivity: 'Pecuária de corte',
      location: 'Rio Negro, MS',
      onboardingCompleted: true,
      areas: {
        create: [
          {
            id: SEED_IDS.areas.boaVistaPasto1,
            name: 'Pasto 1',
            type: FarmAreaType.PASTURE,
            hectares: '48.00',
          },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      id: SEED_IDS.expenses.boaVistaDiesel,
      farmId: SEED_IDS.farms.boaVista,
      amount: '2100.00',
      date: day('2026-03-09'),
      description: 'Diesel',
      category: ExpenseCategory.FUEL,
      source: EntrySource.MANUAL,
      allocations: {
        create: [{ areaId: SEED_IDS.areas.boaVistaPasto1, amount: '2100.00' }],
      },
    },
  });
}
