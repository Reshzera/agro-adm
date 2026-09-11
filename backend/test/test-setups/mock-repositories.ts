import { jest } from '@jest/globals';
import { SEED_CLOCK, SEED_IDS } from '../../src/seed/santa-clara';
import type {
  MessageToStore,
  StoredMessage,
} from '../../src/modules/chat/chat.repository';
import {
  CattleCategory,
  ChatSource,
  FarmAreaType,
  OutboxStatus,
} from '@prisma/client';

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
  defaultMaxGrazingDays: number | null;
  defaultMinRestDays: number | null;
  defaultStockingRateHeadPerHa: string | null;
};

type Lot = {
  id: string;
  farmId: string;
  name: string;
  category: CattleCategory;
  purpose: string | null;
  headCount: number;
  active: boolean;
  startedOn?: Date | null;
  notes?: string | null;
};

type Paddock = {
  id: string;
  farmId: string;
  name: string;
  type: FarmAreaType;
  hectares: string | null;
  usableAreaHa: string | null;
  maxGrazingDays: number | null;
  minRestDays: number | null;
  plannedCapacityHead: number | null;
  forageType: string | null;
  active: boolean;
};

type Occupancy = {
  id: string;
  farmId: string;
  lotId: string;
  paddockId: string;
  startedAt: Date;
  endedAt: Date | null;
  correlationId?: string | null;
};

export type MockRepositories = ReturnType<typeof createMockRepositories>;

export function createMockRepositories() {
  let profiles = new Map<string, Profile>();
  let farms = new Map<string, Farm>();
  let expenses = new Map<string, { farmId: string }>();
  let lots = new Map<string, Lot>();
  let paddocks = new Map<string, Paddock>();
  let occupancies = new Map<string, Occupancy>();
  let movements = new Map<string, Record<string, unknown>>();
  let domainEvents = new Map<string, Record<string, unknown>>();
  let outboxMessages = new Map<string, Record<string, unknown>>();
  let idempotencyKeys = new Map<string, Record<string, unknown>>();
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
        defaultMaxGrazingDays: null,
        defaultMinRestDays: null,
        defaultStockingRateHeadPerHa: null,
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

  const lotWithOccupancy = (lot: Lot) => ({
    ...lot,
    occupancies: [...occupancies.values()]
      .filter((item) => item.lotId === lot.id && !item.endedAt)
      .map((item) => ({
        id: item.id,
        startedAt: item.startedAt,
        paddock: {
          id: item.paddockId,
          name: paddocks.get(item.paddockId)?.name ?? 'Pasto',
        },
      })),
  });
  const paddockWithOccupancies = (paddock: Paddock) => ({
    ...paddock,
    occupancies: [...occupancies.values()]
      .filter((item) => item.paddockId === paddock.id && !item.endedAt)
      .map((item) => {
        const lot = lots.get(item.lotId)!;
        return {
          id: item.id,
          startedAt: item.startedAt,
          lot: { id: lot.id, name: lot.name, headCount: lot.headCount },
        };
      }),
  });

  const cattle = {
    listLots: jest.fn((farmId: string) =>
      [...lots.values()]
        .filter((lot) => lot.farmId === farmId)
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(lotWithOccupancy),
    ),
    findLot: jest.fn((farmId: string, id: string) => {
      const lot = lots.get(id);
      if (!lot || lot.farmId !== farmId) return null;
      return lotWithOccupancy(lot);
    }),
    createLot: jest.fn((input: Lot) => {
      const lot = {
        ...input,
        id: input.id ?? `lot-${lots.size + 1}`,
        active: input.active ?? true,
      };
      lots.set(lot.id, lot);
      return lotWithOccupancy(lot);
    }),
    updateLot: jest.fn((farmId: string, id: string, input: Partial<Lot>) => {
      const lot = lots.get(id);
      if (!lot || lot.farmId !== farmId) return null;
      const updated = { ...lot, ...input };
      lots.set(id, updated);
      return lotWithOccupancy(updated);
    }),
    listPaddocks: jest.fn((farmId: string) =>
      [...paddocks.values()]
        .filter((paddock) => paddock.farmId === farmId)
        .sort((left, right) => left.name.localeCompare(right.name))
        .map(paddockWithOccupancies),
    ),
    findPaddock: jest.fn((farmId: string, id: string) => {
      const paddock = paddocks.get(id);
      return paddock?.farmId === farmId
        ? paddockWithOccupancies(paddock)
        : null;
    }),
    createPaddock: jest.fn((input: Paddock) => {
      const paddock = {
        ...input,
        id: input.id ?? `paddock-${paddocks.size + 1}`,
        active: input.active ?? true,
        hectares: input.hectares ?? null,
        usableAreaHa: input.usableAreaHa ?? null,
        maxGrazingDays: input.maxGrazingDays ?? null,
        minRestDays: input.minRestDays ?? null,
        plannedCapacityHead: input.plannedCapacityHead ?? null,
        forageType: input.forageType ?? null,
      };
      paddocks.set(paddock.id, paddock);
      return paddockWithOccupancies(paddock);
    }),
    updatePaddock: jest.fn(
      (farmId: string, id: string, input: Partial<Paddock>) => {
        const paddock = paddocks.get(id);
        if (!paddock || paddock.farmId !== farmId) return null;
        const updated = { ...paddock, ...input };
        paddocks.set(id, updated);
        return paddockWithOccupancies(updated);
      },
    ),
    farmDefaults: jest.fn((farmId: string) => {
      const item = farms.get(farmId);
      if (!item) return null;
      return {
        defaultMaxGrazingDays: item.defaultMaxGrazingDays,
        defaultMinRestDays: item.defaultMinRestDays,
        defaultStockingRateHeadPerHa:
          item.defaultStockingRateHeadPerHa === null
            ? null
            : { toString: () => item.defaultStockingRateHeadPerHa! },
      };
    }),
    countOccupancies: jest.fn(
      (farmId: string, lotId: string) =>
        [...occupancies.values()].filter(
          (item) => item.farmId === farmId && item.lotId === lotId,
        ).length,
    ),
    createInitialOccupancy: jest.fn(
      (input: Omit<Occupancy, 'id' | 'endedAt'>) => {
        const id = `occupancy-${occupancies.size + 1}`;
        const item = { ...input, id, endedAt: null };
        occupancies.set(id, item);
        const lot = lots.get(input.lotId)!;
        const paddock = paddocks.get(input.paddockId)!;
        return {
          id,
          startedAt: input.startedAt,
          endedAt: null,
          lot: { id: lot.id, name: lot.name, headCount: lot.headCount },
          paddock: { id: paddock.id, name: paddock.name },
        };
      },
    ),
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
    findMovementIdempotency: jest.fn(
      (farmId: string, key: string) =>
        [...idempotencyKeys.values()].find(
          (item) => item.farmId === farmId && item.key === key,
        ) ?? null,
    ),
    createMovementIdempotency: jest.fn(
      (farmId: string, key: string, requestHash: string) => {
        const id = `idempotency-${idempotencyKeys.size + 1}`;
        const item = {
          id,
          farmId,
          scope: 'cattle.move-lot',
          key,
          requestHash,
          result: null,
          completedAt: null,
        };
        idempotencyKeys.set(id, item);
        return item;
      },
    ),
    completeMovementIdempotency: jest.fn(
      (id: string, result: Record<string, unknown>) => {
        const item = idempotencyKeys.get(id)!;
        Object.assign(item, { result, completedAt: new Date() });
        return item;
      },
    ),
    findLotForMovement: jest.fn((farmId: string, id: string) => {
      const lot = lots.get(id);
      if (!lot || lot.farmId !== farmId) return null;
      return {
        id: lot.id,
        name: lot.name,
        headCount: lot.headCount,
        active: lot.active,
      };
    }),
    findDestinationForMovement: jest.fn((farmId: string, id: string) => {
      const paddock = paddocks.get(id);
      if (!paddock || paddock.farmId !== farmId) return null;
      return { id: paddock.id, name: paddock.name, active: paddock.active };
    }),
    findOpenOccupancyForMovement: jest.fn((farmId: string, lotId: string) => {
      const item = [...occupancies.values()].find(
        (occupancy) =>
          occupancy.farmId === farmId &&
          occupancy.lotId === lotId &&
          !occupancy.endedAt,
      );
      if (!item) return null;
      return {
        id: item.id,
        paddockId: item.paddockId,
        startedAt: item.startedAt,
        paddock: {
          id: item.paddockId,
          name: paddocks.get(item.paddockId)!.name,
        },
      };
    }),
    closeOccupancy: jest.fn(
      (id: string, farmIdOrDate: string | Date, maybeEndedAt?: Date) => {
        // Supports both the ticket 06 test helper signature and the command.
        if (farmIdOrDate instanceof Date) {
          const open = [...occupancies.values()].find(
            (item) => item.lotId === id && !item.endedAt,
          );
          if (!open) return false;
          open.endedAt = farmIdOrDate;
          return true;
        }
        const item = occupancies.get(id);
        if (!item || item.farmId !== farmIdOrDate || item.endedAt) {
          return { count: 0 };
        }
        item.endedAt = maybeEndedAt!;
        return { count: 1 };
      },
    ),
    createMovement: jest.fn((input: Record<string, unknown>) => {
      const id = `movement-${movements.size + 1}`;
      const item = { ...input, id, recordedAt: new Date() };
      movements.set(id, item);
      return item;
    }),
    openMovementOccupancy: jest.fn(
      (input: Omit<Occupancy, 'id' | 'endedAt'>) => {
        const already = [...occupancies.values()].some(
          (item) => item.lotId === input.lotId && !item.endedAt,
        );
        if (already) throw new Error('open occupancy already exists');
        const id = `occupancy-${occupancies.size + 1}`;
        const item = { ...input, id, endedAt: null };
        occupancies.set(id, item);
        return item;
      },
    ),
    createMovementEvent: jest.fn((input: Record<string, unknown>) => {
      const id = `event-${domainEvents.size + 1}`;
      const outbox = {
        id: `outbox-${outboxMessages.size + 1}`,
        eventId: id,
        status: OutboxStatus.PENDING,
      };
      const item = { ...input, id, recordedAt: new Date(), outbox };
      domainEvents.set(id, item);
      outboxMessages.set(outbox.id, outbox);
      return item;
    }),
    listMovements: jest.fn(() => [...movements.values()]),
    listDomainEvents: jest.fn(() => [...domainEvents.values()]),
    listOutboxMessages: jest.fn(() => [...outboxMessages.values()]),
    listIdempotencyKeys: jest.fn(() => [...idempotencyKeys.values()]),
  };

  const database = {
    transaction: jest.fn(async <T>(operation: () => Promise<T>) => {
      const before = {
        occupancies: new Map(
          [...occupancies].map(([id, item]) => [id, { ...item }]),
        ),
        movements: new Map(movements),
        domainEvents: new Map(domainEvents),
        outboxMessages: new Map(outboxMessages),
        idempotencyKeys: new Map(
          [...idempotencyKeys].map(([id, item]) => [id, { ...item }]),
        ),
      };
      try {
        return await operation();
      } catch (error) {
        occupancies = before.occupancies;
        movements = before.movements;
        domainEvents = before.domainEvents;
        outboxMessages = before.outboxMessages;
        idempotencyKeys = before.idempotencyKeys;
        throw error;
      }
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
          defaultMaxGrazingDays: 10,
          defaultMinRestDays: 30,
          defaultStockingRateHeadPerHa: '1.80',
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
          defaultMaxGrazingDays: null,
          defaultMinRestDays: null,
          defaultStockingRateHeadPerHa: null,
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
    paddocks = new Map([
      [
        SEED_IDS.areas.pasto4,
        {
          id: SEED_IDS.areas.pasto4,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Pasto 4',
          type: FarmAreaType.PASTURE,
          hectares: '63.50',
          usableAreaHa: '58.00',
          maxGrazingDays: 10,
          minRestDays: null,
          plannedCapacityHead: 120,
          forageType: 'Brachiária brizantha',
          active: true,
        },
      ],
      [
        SEED_IDS.areas.pasto5,
        {
          id: SEED_IDS.areas.pasto5,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Pasto 5',
          type: FarmAreaType.PASTURE,
          hectares: '71.20',
          usableAreaHa: '66.00',
          maxGrazingDays: null,
          minRestDays: 35,
          plannedCapacityHead: null,
          forageType: 'Mombaça',
          active: true,
        },
      ],
      [
        SEED_IDS.areas.pasto6,
        {
          id: SEED_IDS.areas.pasto6,
          farmId: SEED_IDS.farms.santaClara,
          name: 'Pasto 6',
          type: FarmAreaType.PASTURE,
          hectares: '52.80',
          usableAreaHa: '49.00',
          maxGrazingDays: null,
          minRestDays: null,
          plannedCapacityHead: null,
          forageType: 'Brachiária brizantha',
          active: true,
        },
      ],
      [
        SEED_IDS.areas.boaVistaPasto1,
        {
          id: SEED_IDS.areas.boaVistaPasto1,
          farmId: SEED_IDS.farms.boaVista,
          name: 'Pasto 1',
          type: FarmAreaType.PASTURE,
          hectares: '48.00',
          usableAreaHa: '44.00',
          maxGrazingDays: 12,
          minRestDays: 28,
          plannedCapacityHead: null,
          forageType: 'Brachiária brizantha',
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
    movements = new Map();
    domainEvents = new Map();
    outboxMessages = new Map();
    idempotencyKeys = new Map();
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
    cattle.createLot.mockClear();
    cattle.updateLot.mockClear();
    cattle.listPaddocks.mockClear();
    cattle.findPaddock.mockClear();
    cattle.createPaddock.mockClear();
    cattle.updatePaddock.mockClear();
    cattle.farmDefaults.mockClear();
    cattle.countOccupancies.mockClear();
    cattle.createInitialOccupancy.mockClear();
    cattle.findOpenOccupancy.mockClear();
    cattle.listOccupancies.mockClear();
    cattle.openOccupancy.mockClear();
    cattle.closeOccupancy.mockClear();
    cattle.findMovementIdempotency.mockClear();
    cattle.createMovementIdempotency.mockClear();
    cattle.findLotForMovement.mockClear();
    cattle.findDestinationForMovement.mockClear();
    cattle.findOpenOccupancyForMovement.mockClear();
    cattle.createMovement.mockClear();
    cattle.openMovementOccupancy.mockClear();
    cattle.createMovementEvent.mockClear();
    cattle.completeMovementIdempotency.mockClear();
    database.transaction.mockClear();
  }

  reset();
  return {
    auth,
    farm,
    profile,
    chat,
    financial,
    cattle,
    database,
    reset,
    now: new Date(SEED_CLOCK),
  };
}
