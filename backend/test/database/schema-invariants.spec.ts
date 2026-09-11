import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseEnv } from 'dotenv';
import { Client } from 'pg';

function connectionString(): string {
  const file = path.resolve(process.cwd(), '../.env');
  const url = parseEnv(readFileSync(file)).DATABASE_URL;
  if (!url) {
    throw new Error(`DATABASE_URL não está no ${file}.`);
  }
  return url;
}

const IDS = {
  user: 'invariant-user',
  farm: 'invariant-farm',
  paddock: 'invariant-paddock',
  lot: 'invariant-lot',
};

describe('schema invariants', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: connectionString() });
    try {
      await client.connect();
    } catch (cause) {
      throw new Error(
        'Postgres não respondeu. Este spec prova os índices parciais do ticket 05 ' +
          'contra o banco real: suba com `yarn db:up` e aplique `yarn db:migrate`.',
        { cause },
      );
    }
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "user" ("id", "email", "updatedAt")
       VALUES ($1, 'invariant@test', now())`,
      [IDS.user],
    );
    await client.query(
      `INSERT INTO "farm" ("id", "ownerUserId", "updatedAt")
       VALUES ($1, $2, now())`,
      [IDS.farm, IDS.user],
    );
    await client.query(
      `INSERT INTO "farm_area" ("id", "farmId", "name", "type", "updatedAt")
       VALUES ($1, $2, 'Pasto', 'PASTURE', now())`,
      [IDS.paddock, IDS.farm],
    );
    await client.query(
      `INSERT INTO "cattle_lot" ("id", "farmId", "name", "category", "updatedAt")
       VALUES ($1, $2, 'Lote', 'STEERS', now())`,
      [IDS.lot, IDS.farm],
    );
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  function openOccupancy(id: string, endedAt: string | null): Promise<unknown> {
    return client.query(
      `INSERT INTO "paddock_occupancy" ("id", "farmId", "lotId", "paddockId", "startedAt", "endedAt")
       VALUES ($1, $2, $3, $4, now(), $5)`,
      [id, IDS.farm, IDS.lot, IDS.paddock, endedAt],
    );
  }

  function attentionItem(
    id: string,
    status: string,
    scopeId: string,
  ): Promise<unknown> {
    return client.query(
      `INSERT INTO "farm_attention_item"
         ("id", "farmId", "ruleId", "ruleVersion", "scopeType", "scopeId",
          "category", "severity", "titleCode", "facts", "status")
       VALUES ($1, $2, 'rotation.max_grazing_days', 1, 'PADDOCK', $3,
               'rotation', 'WARNING', 'rotation.review_due', '{}', $4)`,
      [id, IDS.farm, scopeId, status],
    );
  }

  it('refuses a second open occupancy for the same lot', async () => {
    await openOccupancy('occupancy-1', null);

    await expect(openOccupancy('occupancy-2', null)).rejects.toMatchObject({
      code: '23505',
      constraint: 'paddock_occupancy_open_lot_key',
    });
  });

  it('accepts a new occupancy once the previous one closed', async () => {
    await openOccupancy('occupancy-1', null);
    await client.query(
      `UPDATE "paddock_occupancy" SET "endedAt" = now() WHERE "id" = 'occupancy-1'`,
    );

    await expect(openOccupancy('occupancy-2', null)).resolves.toBeDefined();
  });

  it('keeps every closed occupancy of a lot', async () => {
    await openOccupancy('occupancy-1', '2026-02-10T11:00:00.000Z');
    await openOccupancy('occupancy-2', '2026-03-01T11:00:00.000Z');

    const rows = await client.query(
      `SELECT "id" FROM "paddock_occupancy" WHERE "lotId" = $1`,
      [IDS.lot],
    );

    expect(rows.rowCount).toBe(2);
  });

  it('refuses a second open attention item for the same rule and scope', async () => {
    await attentionItem('item-1', 'NEW', IDS.paddock);

    await expect(
      attentionItem('item-2', 'SEEN', IDS.paddock),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'farm_attention_item_open_rule_scope_key',
    });
  });

  it('accepts a new attention item once the previous one resolved', async () => {
    await attentionItem('item-1', 'RESOLVED', IDS.paddock);

    await expect(
      attentionItem('item-2', 'NEW', IDS.paddock),
    ).resolves.toBeDefined();
  });

  it('scopes the attention item invariant per rule and scope', async () => {
    await attentionItem('item-1', 'NEW', IDS.paddock);

    await expect(
      attentionItem('item-2', 'NEW', IDS.lot),
    ).resolves.toBeDefined();
  });
});
