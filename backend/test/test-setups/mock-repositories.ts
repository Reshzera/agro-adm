import { jest } from '@jest/globals';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type {
  MessageToStore,
  StoredMessage,
} from '../../src/modules/chat/chat.repository';
import { CattleCategory, ChatSource } from '@prisma/client';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
};

type Farm = {
  id: string;
  ownerUserId: string;
  name: string | null;
  totalAreaHa: string | null;
  primaryActivity: string | null;
  location: string | null;
  mainCrops: string | null;
  approximateAnimalCount: number | null;
  agentContext: string | null;
  onboardingCompleted: boolean;
};

type Lot = {
  id: string;
  farmId: string;
  name: string;
  category: CattleCategory;
  purpose: string | null;
  headCount: number;
  active: boolean;
};

type Occupancy = {
  id: string;
  farmId: string;
  lotId: string;
  paddockId: string;
  startedAt: Date;
  endedAt: Date | null;
};

export type MockRepositories = ReturnType<typeof createMockRepositories>;

export function createMockRepositories() {
  let profiles = new Map<string, Profile>();
  let farms = new Map<string, Farm>();
  let expenses = new Map<string, { farmId: string }>();
  let lots = new Map<string, Lot>();
  let occupancies = new Map<string, Occupancy>();
  let chats = new Map<
    string,
    {
      farmId: string;
      title: string | null;
      source: ChatSource;
      updatedAt: Date;
      archivedAt: Date | null;
      messages: StoredMessage[];
    }
  >();

  function farmsOwnedBy(userId: string): Farm[] {
    return [...farms.values()].filter((farm) => farm.ownerUserId === userId);
  }

  const auth = {
    createEmptyFarmForUser: jest.fn((ownerUserId: string) => {
      if (farmsOwnedBy(ownerUserId).length) {
        throw new Error(
          'Unique constraint failed on the fields: (`ownerUserId`)',
        );
      }
      const id = `farm-${ownerUserId}`;
      farms.set(id, {
        id,
        ownerUserId,
        name: null,
        totalAreaHa: null,
        primaryActivity: null,
        location: null,
        mainCrops: null,
        approximateAnimalCount: null,
        agentContext: null,
        onboardingCompleted: false,
      });
    }),
    findFarmIdForUser: jest.fn((userId: string) => {
      const owned = farmsOwnedBy(userId);
      if (owned.length > 1) {
        throw new Error('findUnique matched more than one farm.');
      }
      return owned[0]?.id ?? null;
    }),
  };

  const farm = {
    findForOwner: jest.fn((id: string, ownerUserId: string) => {
      const item = farms.get(id);
      if (!item || item.ownerUserId !== ownerUserId) return null;
      return {
        ...item,
      };
    }),
    findForAgent: jest.fn((id: string) => farms.get(id) ?? null),
    updateForAgent: jest.fn((id: string, input: Partial<Farm>) => {
      const current = farms.get(id);
      if (!current) throw new Error('Farm not found.');
      const updated = { ...current, ...input };
      farms.set(id, updated);
      return updated;
    }),
  };

  const profile = {
    findByUserId: jest.fn((userId: string) => profiles.get(userId) ?? null),
    update: jest.fn(
      (
        userId: string,
        input: Partial<Omit<Profile, 'id' | 'emailVerified'>> & {
          email?: string;
        },
      ) => {
        const current = profiles.get(userId);
        if (!current) throw new Error('Profile not found.');
        const updated = {
          ...current,
          ...input,
          ...(input.email !== undefined ? { emailVerified: false } : {}),
        };
        profiles.set(userId, updated);
        return updated;
      },
    ),
  };

  const financial = {
    deleteExpense: jest.fn((farmId: string, id: string) => {
      const expense = expenses.get(id);
      if (!expense || expense.farmId !== farmId) return { count: 0 };
      expenses.delete(id);
      return { count: 1 };
    }),
  };

  const chat = {
    listForFarm: jest.fn((farmId: string) =>
      [...chats.entries()]
        .filter(([, item]) => item.farmId === farmId && !item.archivedAt)
        .sort(([, left], [, right]) => +right.updatedAt - +left.updatedAt)
        .map(([id, item]) => ({
          id,
          title: item.title,
          source: item.source,
          updatedAt: item.updatedAt,
        })),
    ),
    findForFarm: jest.fn((id: string, farmId: string) => {
      const item = chats.get(id);
      if (!item || item.farmId !== farmId || item.archivedAt) return null;
      return { id, title: item.title, messages: item.messages };
    }),
    create: jest.fn((id: string, farmId: string) => {
      const item = {
        farmId,
        title: null,
        source: ChatSource.WEB,
        updatedAt: new Date(),
        archivedAt: null,
        messages: [] as StoredMessage[],
      };
      chats.set(id, item);
      return { id, title: item.title, messages: item.messages };
    }),
    rename: jest.fn((id: string, farmId: string, title: string) => {
      const item = chats.get(id);
      if (!item || item.farmId !== farmId || item.archivedAt) return false;
      item.title = title;
      item.updatedAt = new Date();
      return true;
    }),
    archive: jest.fn((id: string, farmId: string) => {
      const item = chats.get(id);
      if (!item || item.farmId !== farmId || item.archivedAt) return false;
      item.archivedAt = new Date();
      return true;
    }),
    setGeneratedTitle: jest.fn((id: string, title: string) => {
      const item = chats.get(id);
      if (item && item.title === null && !item.archivedAt) item.title = title;
    }),
    replaceMessages: jest.fn((id: string, messages: MessageToStore[]) => {
      const item = chats.get(id);
      if (!item) throw new Error('Chat not found.');
      item.messages = JSON.parse(JSON.stringify(messages)) as StoredMessage[];
      item.updatedAt = new Date();
    }),
    farmAgentContext: jest.fn((farmId: string) => {
      const farm = farms.get(farmId);
      if (!farm) return null;
      return {
        name: farm.name,
        totalAreaHa: farm.totalAreaHa
          ? { toString: () => farm.totalAreaHa! }
          : null,
        primaryActivity: farm.primaryActivity,
        location: farm.location,
        mainCrops: farm.mainCrops,
        approximateAnimalCount: farm.approximateAnimalCount,
        agentContext: farm.agentContext,
        onboardingCompleted: farm.onboardingCompleted,
        areas: [
          { id: SEED_IDS.areas.pasto4, name: 'Pasto 4', type: 'PASTURE' },
          { id: SEED_IDS.areas.pasto5, name: 'Pasto 5', type: 'PASTURE' },
          { id: SEED_IDS.areas.pasto6, name: 'Pasto 6', type: 'PASTURE' },
          { id: SEED_IDS.areas.talhao1, name: 'Talhão 1', type: 'CROP_FIELD' },
          { id: SEED_IDS.areas.talhao2, name: 'Talhão 2', type: 'CROP_FIELD' },
        ],
      };
    }),
  };

  const cattle = {
    listLots: jest.fn((farmId: string) =>
      [...lots.values()]
        .filter((lot) => lot.farmId === farmId && lot.active)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ),
    findLot: jest.fn((id: string, farmId: string) => {
      const lot = lots.get(id);
      if (!lot || lot.farmId !== farmId) return null;
      return { ...lot };
    }),
    findOpenOccupancy: jest.fn((lotId: string) => {
      const open = [...occupancies.values()].find(
        (item) => item.lotId === lotId && !item.endedAt,
      );
      return open ? { ...open } : null;
    }),
    listOccupancies: jest.fn((paddockId: string) =>
      [...occupancies.values()]
        .filter((item) => item.paddockId === paddockId)
        .sort((left, right) => +left.startedAt - +right.startedAt)
        .map((item) => ({ ...item })),
    ),
    openOccupancy: jest.fn(
      (input: Omit<Occupancy, 'id' | 'endedAt'> & { id?: string }) => {
        const already = [...occupancies.values()].some(
          (item) => item.lotId === input.lotId && !item.endedAt,
        );
        if (already) {
          throw new Error(
            'Unique constraint failed on the index: (`paddock_occupancy_open_lot_key`)',
          );
        }
        const id = input.id ?? `occupancy-${occupancies.size + 1}`;
        const occupancy = { ...input, id, endedAt: null };
        occupancies.set(id, occupancy);
        return { ...occupancy };
      },
    ),
    closeOccupancy: jest.fn((lotId: string, endedAt: Date) => {
      const open = [...occupancies.values()].find(
        (item) => item.lotId === lotId && !item.endedAt,
      );
      if (!open) return false;
      open.endedAt = endedAt;
      return true;
    }),
  };

  function reset(): void {
    profiles = new Map([
      [
        SEED_IDS.users.joao,
        {
          id: SEED_IDS.users.joao,
          name: 'João Pereira',
          email: 'joao@santaclara.test',
          emailVerified: true,
          phone: '+5567999990001',
        },
      ],
    ]);
    farms = new Map([
      [
        SEED_IDS.farms.santaClara,
        {
          id: SEED_IDS.farms.santaClara,
          ownerUserId: SEED_IDS.users.joao,
          name: 'Fazenda Santa Clara',
          totalAreaHa: '840.00',
          primaryActivity: 'Pecuária de corte',
          location: 'Camapuã, MS',
          mainCrops: 'Milho safrinha',
          approximateAnimalCount: 920,
          agentContext: 'João é o gerente.',
          onboardingCompleted: true,
        },
      ],
      [
        SEED_IDS.farms.boaVista,
        {
          id: SEED_IDS.farms.boaVista,
          ownerUserId: SEED_IDS.users.marina,
          name: 'Fazenda Boa Vista',
          totalAreaHa: '320.00',
          primaryActivity: 'Agricultura',
          location: 'Dourados, MS',
          mainCrops: 'Soja',
          approximateAnimalCount: null,
          agentContext: null,
          onboardingCompleted: true,
        },
      ],
    ]);
    lots = new Map([
      [
        SEED_IDS.lots.recria,
        {
          id: SEED_IDS.lots.recria,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Lote 12',
          category: CattleCategory.STEERS,
          purpose: 'Recria',
          headCount: 180,
          active: true,
        },
      ],
      [
        SEED_IDS.lots.bezerros,
        {
          id: SEED_IDS.lots.bezerros,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Lote 8',
          category: CattleCategory.CALVES,
          purpose: 'Bezerros desmamados',
          headCount: 96,
          active: true,
        },
      ],
      [
        SEED_IDS.lots.vacas,
        {
          id: SEED_IDS.lots.vacas,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Lote 3',
          category: CattleCategory.COWS,
          purpose: 'Vacas de cria',
          headCount: 240,
          active: true,
        },
      ],
      [
        SEED_IDS.lots.boaVistaNelore,
        {
          id: SEED_IDS.lots.boaVistaNelore,
          farmId: SEED_IDS.farms.boaVista,
          name: 'Lote 1',
          category: CattleCategory.HEIFERS,
          purpose: 'Novilhas de reposição',
          headCount: 64,
          active: true,
        },
      ],
    ]);
    occupancies = new Map([
      [
        SEED_IDS.occupancies.recriaPasto6,
        {
          id: SEED_IDS.occupancies.recriaPasto6,
          farmId: SEED_IDS.farms.santaClara,
          lotId: SEED_IDS.lots.recria,
          paddockId: SEED_IDS.areas.pasto6,
          startedAt: new Date('2026-01-20T11:00:00.000Z'),
          endedAt: new Date('2026-02-10T11:00:00.000Z'),
        },
      ],
      [
        SEED_IDS.occupancies.recriaPasto4,
        {
          id: SEED_IDS.occupancies.recriaPasto4,
          farmId: SEED_IDS.farms.santaClara,
          lotId: SEED_IDS.lots.recria,
          paddockId: SEED_IDS.areas.pasto4,
          startedAt: new Date('2026-03-04T11:00:00.000Z'),
          endedAt: null,
        },
      ],
      [
        SEED_IDS.occupancies.bezerrosPasto5,
        {
          id: SEED_IDS.occupancies.bezerrosPasto5,
          farmId: SEED_IDS.farms.santaClara,
          lotId: SEED_IDS.lots.bezerros,
          paddockId: SEED_IDS.areas.pasto5,
          startedAt: new Date('2026-03-12T11:00:00.000Z'),
          endedAt: null,
        },
      ],
      [
        SEED_IDS.occupancies.boaVistaNelorePasto1,
        {
          id: SEED_IDS.occupancies.boaVistaNelorePasto1,
          farmId: SEED_IDS.farms.boaVista,
          lotId: SEED_IDS.lots.boaVistaNelore,
          paddockId: SEED_IDS.areas.boaVistaPasto1,
          startedAt: new Date('2026-02-02T11:00:00.000Z'),
          endedAt: null,
        },
      ],
    ]);
    expenses = new Map([
      [SEED_IDS.expenses.diesel, { farmId: SEED_IDS.farms.santaClara }],
      [SEED_IDS.expenses.vacina, { farmId: SEED_IDS.farms.santaClara }],
      [SEED_IDS.expenses.boaVistaDiesel, { farmId: SEED_IDS.farms.boaVista }],
    ]);
    chats = new Map([
      [
        SEED_IDS.chats.primeiraConversa,
        {
          farmId: SEED_IDS.farms.santaClara,
          title: 'Gastos de março',
          source: ChatSource.WEB,
          updatedAt: new Date('2026-03-10T14:00:04.000Z'),
          archivedAt: null,
          messages: [
            {
              id: 'seed-message-1',
              role: 'user',
              parts: [{ type: 'text', text: 'quanto gastei esse mês?' }],
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
            },
          ],
        },
      ],
    ]);
    auth.createEmptyFarmForUser.mockClear();
    auth.findFarmIdForUser.mockClear();
    farm.findForOwner.mockClear();
    farm.findForAgent.mockClear();
    farm.updateForAgent.mockClear();
    profile.findByUserId.mockClear();
    profile.update.mockClear();
    chat.findForFarm.mockClear();
    chat.listForFarm.mockClear();
    chat.create.mockClear();
    chat.rename.mockClear();
    chat.archive.mockClear();
    chat.setGeneratedTitle.mockClear();
    chat.replaceMessages.mockClear();
    chat.farmAgentContext.mockClear();
    financial.deleteExpense.mockClear();
    cattle.listLots.mockClear();
    cattle.findLot.mockClear();
    cattle.findOpenOccupancy.mockClear();
    cattle.listOccupancies.mockClear();
    cattle.openOccupancy.mockClear();
    cattle.closeOccupancy.mockClear();
  }

  reset();
  return {
    auth,
    farm,
    profile,
    chat,
    financial,
    cattle,
    reset,
    now: new Date(SEED_CLOCK),
  };
}
