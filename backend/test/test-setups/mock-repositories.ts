import { jest } from '@jest/globals';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type {
  MessageToStore,
  StoredMessage,
} from '../../src/modules/chat/chat.repository';
import { ChatSource } from '@prisma/client';

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

export type MockRepositories = ReturnType<typeof createMockRepositories>;

export function createMockRepositories() {
  let profiles = new Map<string, Profile>();
  let farms = new Map<string, Farm>();
  let expenses = new Map<string, { farmId: string }>();
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
          { id: SEED_IDS.areas.talhao1, name: 'Talhão 1', type: 'CROP_FIELD' },
          { id: SEED_IDS.areas.talhao2, name: 'Talhão 2', type: 'CROP_FIELD' },
        ],
      };
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
  }

  reset();
  return {
    auth,
    farm,
    profile,
    chat,
    financial,
    reset,
    now: new Date(SEED_CLOCK),
  };
}
