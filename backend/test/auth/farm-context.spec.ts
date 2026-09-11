import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { AuthRepository } from '../../src/modules/auth/auth.repository';

type FarmIdRow = { id: string } | null;

describe('farm context resolution', () => {
  function repositoryWith(findUnique: jest.Mock) {
    return new AuthRepository({ farm: { findUnique } } as never);
  }

  it('resolves the farm of a user through the unique owner lookup', async () => {
    const findUnique = jest
      .fn<() => Promise<FarmIdRow>>()
      .mockResolvedValue({ id: 'farm-1' });

    await expect(
      repositoryWith(findUnique).findFarmIdForUser('user-1'),
    ).resolves.toBe('farm-1');
    expect(findUnique).toHaveBeenCalledWith({
      where: { ownerUserId: 'user-1' },
      select: { id: true },
    });
  });

  it('has no farm context when the user owns no farm', async () => {
    const findUnique = jest
      .fn<() => Promise<FarmIdRow>>()
      .mockResolvedValue(null);

    await expect(
      repositoryWith(findUnique).findFarmIdForUser('user-1'),
    ).resolves.toBeNull();
  });

  it('enforces one farm per owner in the database', () => {
    expect(readFileSync('prisma/schema.prisma', 'utf8')).toContain(
      '@@unique([ownerUserId])',
    );
    expect(
      readFileSync(
        'prisma/migrations/20260911120000_one_farm_per_owner/migration.sql',
        'utf8',
      ),
    ).toContain(
      'CREATE UNIQUE INDEX "farm_ownerUserId_key" ON "farm"("ownerUserId")',
    );
  });
});
