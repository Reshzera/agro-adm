import { jest } from '@jest/globals';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type { StoredUiMessage } from '../../src/modules/chat/chat.repository';

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
  onboardingCompleted: boolean;
};

export type MockRepositories = ReturnType<typeof createMockRepositories>;

export function createMockRepositories() {
  let profiles = new Map<string, Profile>();
  let farms = new Map<string, Farm>();
  let chats = new Map<
    string,
    { farmId: string; messages: StoredUiMessage[] }
  >();

  const auth = {
    createEmptyFarmForUser: jest.fn((ownerUserId: string) => {
      const id = `farm-${ownerUserId}`;
      farms.set(id, {
        id,
        ownerUserId,
        name: null,
        onboardingCompleted: false,
      });
    }),
    findFarmIdForUser: jest.fn((userId: string) => {
      return (
        [...farms.values()].find((farm) => farm.ownerUserId === userId)?.id ??
        null
      );
    }),
  };

  const farm = {
    findForOwner: jest.fn((id: string, ownerUserId: string) => {
      const item = farms.get(id);
      if (!item || item.ownerUserId !== ownerUserId) return null;
      return {
        id: item.id,
        name: item.name,
        onboardingCompleted: item.onboardingCompleted,
      };
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

  const chat = {
    findForFarm: jest.fn((id: string, farmId: string) => {
      const item = chats.get(id);
      if (!item || item.farmId !== farmId) return null;
      return { id, messages: item.messages };
    }),
    create: jest.fn((id: string, farmId: string) => {
      const item = { farmId, messages: [] as StoredUiMessage[] };
      chats.set(id, item);
      return { id, messages: item.messages };
    }),
    replaceMessages: jest.fn((id: string, messages: StoredUiMessage[]) => {
      const item = chats.get(id);
      if (!item) throw new Error('Chat not found.');
      item.messages = messages;
    }),
    farmAgentContext: jest.fn((farmId: string) => {
      const farm = farms.get(farmId);
      if (!farm) return null;
      return {
        name: farm.name,
        totalAreaHa: { toString: () => '840.00' },
        primaryActivity: 'Pecuária de corte',
        agentContext: 'João é o gerente.',
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
          onboardingCompleted: true,
        },
      ],
      [
        SEED_IDS.farms.boaVista,
        {
          id: SEED_IDS.farms.boaVista,
          ownerUserId: SEED_IDS.users.marina,
          name: 'Fazenda Boa Vista',
          onboardingCompleted: true,
        },
      ],
    ]);
    chats = new Map([
      [
        SEED_IDS.chats.primeiraConversa,
        {
          farmId: SEED_IDS.farms.santaClara,
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
    profile.findByUserId.mockClear();
    profile.update.mockClear();
    chat.findForFarm.mockClear();
    chat.create.mockClear();
    chat.replaceMessages.mockClear();
    chat.farmAgentContext.mockClear();
  }

  reset();
  return { auth, farm, profile, chat, reset, now: new Date(SEED_CLOCK) };
}
