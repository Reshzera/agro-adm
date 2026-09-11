import { EntrySource } from '@prisma/client';
import { DatabaseService } from '../../src/modules/database/database.service';
import type { PrismaService } from '../../src/modules/database/prisma.service';
import { FarmRepository } from '../../src/modules/farm/farm.repository';
import { FinancialRepository } from '../../src/modules/financial/financial.repository';

type FarmRow = { id: string; name: string | null };
type RevenueRow = { farmId: string; description: string };

type Tables = {
  farms: Map<string, FarmRow>;
  revenues: Map<string, RevenueRow>;
};

function clientFor(tables: Tables) {
  return {
    farm: {
      update({
        where,
        data,
      }: {
        where: { id: string };
        data: { name: string };
      }) {
        const current = tables.farms.get(where.id);
        if (!current) throw new Error(`fazenda ${where.id} não existe`);
        const updated = { ...current, ...data };
        tables.farms.set(where.id, updated);
        return Promise.resolve(updated);
      },
    },
    revenue: {
      create({ data }: { data: RevenueRow }) {
        const id = `revenue-${tables.revenues.size + 1}`;
        tables.revenues.set(id, data);
        return Promise.resolve({ id, ...data });
      },
    },
  };
}

function createFakePrisma() {
  const committed: Tables = { farms: new Map(), revenues: new Map() };
  committed.farms.set('farm-1', { id: 'farm-1', name: 'Santa Clara' });

  let opened = 0;

  const prisma = {
    ...clientFor(committed),
    $transaction<T>(run: (tx: unknown) => Promise<T>): Promise<T> {
      opened += 1;
      const draft: Tables = {
        farms: new Map(committed.farms),
        revenues: new Map(committed.revenues),
      };
      return run(clientFor(draft)).then((result) => {
        committed.farms = draft.farms;
        committed.revenues = draft.revenues;
        return result;
      });
    },
  };

  return {
    prisma: prisma as unknown as PrismaService,
    committed,
    opened: () => opened,
  };
}

describe('ambient transaction seam', () => {
  const revenue = {
    farmId: 'farm-1',
    amount: '1000.00',
    date: new Date('2026-03-16T00:00:00.000Z'),
    description: 'Venda de boi gordo',
    source: EntrySource.MANUAL,
  };

  it('rolls back writes from two different repositories together', async () => {
    const fake = createFakePrisma();
    const db = new DatabaseService(fake.prisma);
    const farms = new FarmRepository(db);
    const financial = new FinancialRepository(db);

    await expect(
      db.transaction(async () => {
        await farms.updateForAgent('farm-1', { name: 'Santa Clara II' });
        await financial.createRevenue(revenue);
        throw new Error('falhou depois das duas escritas');
      }),
    ).rejects.toThrow('falhou depois das duas escritas');

    expect(fake.committed.farms.get('farm-1')?.name).toBe('Santa Clara');
    expect(fake.committed.revenues.size).toBe(0);
  });

  it('commits writes from two different repositories in one transaction', async () => {
    const fake = createFakePrisma();
    const db = new DatabaseService(fake.prisma);
    const farms = new FarmRepository(db);
    const financial = new FinancialRepository(db);

    await db.transaction(async () => {
      await farms.updateForAgent('farm-1', { name: 'Santa Clara II' });
      await financial.createRevenue(revenue);
    });

    expect(fake.committed.farms.get('farm-1')?.name).toBe('Santa Clara II');
    expect(fake.committed.revenues.size).toBe(1);
    expect(fake.opened()).toBe(1);
  });

  it('writes straight to the client when there is no ambient transaction', async () => {
    const fake = createFakePrisma();
    const db = new DatabaseService(fake.prisma);
    const farms = new FarmRepository(db);

    await farms.updateForAgent('farm-1', { name: 'Santa Clara II' });

    expect(fake.committed.farms.get('farm-1')?.name).toBe('Santa Clara II');
    expect(fake.opened()).toBe(0);
  });

  it('joins an open transaction instead of opening a nested one', async () => {
    const fake = createFakePrisma();
    const db = new DatabaseService(fake.prisma);
    const farms = new FarmRepository(db);
    const financial = new FinancialRepository(db);

    await expect(
      db.transaction(async () => {
        await farms.updateForAgent('farm-1', { name: 'Santa Clara II' });
        await db.transaction(() => financial.createRevenue(revenue));
        throw new Error('falhou depois da transação interna');
      }),
    ).rejects.toThrow('falhou depois da transação interna');

    expect(fake.opened()).toBe(1);
    expect(fake.committed.farms.get('farm-1')?.name).toBe('Santa Clara');
    expect(fake.committed.revenues.size).toBe(0);
  });
});
