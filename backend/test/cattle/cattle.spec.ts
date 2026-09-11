import { SEED_IDS } from '../../src/seed/santa-clara';
import {
  moveCattleLotAgentInputSchema,
  moveCattleLotCommandSchema,
} from '../../src/modules/cattle/commands/move-cattle-lot.command';
import { createTestApp, type TestApp } from '../test-setups/test-app';

type CreatedLot = { id: string; headCount: number; notes: string | null };
type CreatedPaddock = {
  id: string;
  plannedCapacityHead: number | null;
  effectiveSettings: {
    maxGrazingDays: { value: number | null; source: string };
    minRestDays: { value: number | null; source: string };
    stockingRateHeadPerHa: { value: string | null; source: string };
  };
};
type MovementResponse = {
  movement: {
    lot: { id: string };
    fromPaddock: { id: string };
    toPaddock: { id: string };
    occurredAt: string;
  };
  event: { causationId: string; occurredAt: string; recordedAt: string };
  outbox: { status: string };
};

describe('cattle and paddock management', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reseed();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('creates and edits a lot without requiring individual animals', async () => {
    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/lots')
      .send({
        name: '  Lote 14  ',
        category: 'HEIFERS',
        headCount: 72,
        purpose: 'Reposição',
      })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        name: 'Lote 14',
        category: 'HEIFERS',
        headCount: 72,
        currentOccupancy: null,
      }),
    );
    const createdLot = created.body as CreatedLot;

    const updated = await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/lots/${createdLot.id}`)
      .send({ headCount: 75, notes: 'Apartação concluída' })
      .expect(200);
    const updatedLot = updated.body as CreatedLot;
    expect(updatedLot.headCount).toBe(75);
    expect(updatedLot.notes).toBe('Apartação concluída');

    await testApp
      .as(SEED_IDS.users.joao)
      .get('/cattle/lots')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: createdLot.id, headCount: 75 }),
          ]),
        );
      });
  });

  it('creates and edits a paddock and resolves blank settings from the farm', async () => {
    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/paddocks')
      .send({
        name: 'Pasto 7',
        hectares: '42.00',
        usableAreaHa: '39.50',
        forageType: 'Zuri',
      })
      .expect(201);

    const createdPaddock = created.body as CreatedPaddock;
    expect(createdPaddock.effectiveSettings).toEqual(
      expect.objectContaining({
        maxGrazingDays: { value: 10, source: 'FARM' },
        minRestDays: { value: 30, source: 'FARM' },
        stockingRateHeadPerHa: { value: '1.80', source: 'FARM' },
      }),
    );
    const updated = await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/paddocks/${createdPaddock.id}`)
      .send({ maxGrazingDays: 8, plannedCapacityHead: 84 })
      .expect(200);
    const updatedPaddock = updated.body as CreatedPaddock;
    expect(updatedPaddock.effectiveSettings.maxGrazingDays).toEqual({
      value: 8,
      source: 'PADDOCK',
    });
    expect(updatedPaddock.plannedCapacityHead).toBe(84);
  });

  it('opens a first occupancy but refuses to use it as a movement command', async () => {
    const response = await testApp
      .as(SEED_IDS.users.joao)
      .post(`/cattle/lots/${SEED_IDS.lots.vacas}/initial-placement`)
      .send({
        paddockId: SEED_IDS.areas.pasto6,
        startedAt: '2026-03-16T12:00:00.000Z',
      })
      .expect(201);

    const placement = response.body as {
      lot: { id: string };
      paddock: { id: string };
      endedAt: string | null;
    };
    expect(placement.lot.id).toBe(SEED_IDS.lots.vacas);
    expect(placement.paddock.id).toBe(SEED_IDS.areas.pasto6);
    expect(placement.endedAt).toBeNull();

    await testApp
      .as(SEED_IDS.users.joao)
      .post(`/cattle/lots/${SEED_IDS.lots.vacas}/initial-placement`)
      .send({
        paddockId: SEED_IDS.areas.pasto5,
        startedAt: '2026-03-17T12:00:00.000Z',
      })
      .expect(400);
  });

  it("does not find another farm's lots or paddocks", async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/lots/${SEED_IDS.lots.boaVistaNelore}`)
      .send({ headCount: 1 })
      .expect(404);

    await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/paddocks/${SEED_IDS.areas.boaVistaPasto1}`)
      .send({ name: 'Tentativa' })
      .expect(404);

    await testApp
      .as(SEED_IDS.users.joao)
      .post(`/cattle/lots/${SEED_IDS.lots.vacas}/initial-placement`)
      .send({
        paddockId: SEED_IDS.areas.boaVistaPasto1,
        startedAt: '2026-03-16T12:00:00.000Z',
      })
      .expect(404);

    const lots = await testApp
      .as(SEED_IDS.users.joao)
      .get('/cattle/lots')
      .expect(200);
    expect(lots.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: SEED_IDS.lots.boaVistaNelore }),
      ]),
    );
  });

  it('moves a lot atomically, preserves a backdated occurrence and queues its event', async () => {
    const command = {
      lotId: SEED_IDS.lots.recria,
      fromPaddockId: SEED_IDS.areas.pasto4,
      toPaddockId: SEED_IDS.areas.pasto6,
      occurredAt: '2026-03-10T14:30:00.000Z',
      reason: 'Fim do ciclo de pastejo',
      idempotencyKey: 'move-recria-2026-03-10',
      causationId: 'manual-command-42',
    };

    const first = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send(command)
      .expect(201);

    const firstBody = first.body as MovementResponse;
    expect(firstBody.movement.lot.id).toBe(SEED_IDS.lots.recria);
    expect(firstBody.movement.fromPaddock.id).toBe(SEED_IDS.areas.pasto4);
    expect(firstBody.movement.toPaddock.id).toBe(SEED_IDS.areas.pasto6);
    expect(firstBody.movement.occurredAt).toBe(command.occurredAt);
    expect(firstBody.event.causationId).toBe(command.causationId);
    expect(firstBody.event.occurredAt).toBe(command.occurredAt);
    expect(firstBody.event.recordedAt).not.toBe(firstBody.event.occurredAt);
    expect(firstBody.outbox.status).toBe('PENDING');
    expect(testApp.repositories.cattle.listMovements()).toHaveLength(1);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(1);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(1);
    expect(
      testApp.repositories.cattle.findOpenOccupancy(SEED_IDS.lots.recria),
    ).toEqual(expect.objectContaining({ paddockId: SEED_IDS.areas.pasto6 }));

    const replay = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send(command)
      .expect(201);

    expect(replay.body as MovementResponse).toEqual(firstBody);
    expect(testApp.repositories.cattle.listMovements()).toHaveLength(1);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(1);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(1);
  });

  it.each([
    ['movement.lot_exists', { lotId: 'missing-lot' }],
    ['movement.lot_exists', { lotId: SEED_IDS.lots.boaVistaNelore }],
    [
      'movement.destination_exists',
      { toPaddockId: SEED_IDS.areas.boaVistaPasto1 },
    ],
    [
      'movement.source_matches_current_location',
      { fromPaddockId: SEED_IDS.areas.pasto5 },
    ],
    [
      'movement.destination_is_different',
      { toPaddockId: SEED_IDS.areas.pasto4 },
    ],
  ])('rejects invariant %s before writing', async (check, changes) => {
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send({
        lotId: SEED_IDS.lots.recria,
        fromPaddockId: SEED_IDS.areas.pasto4,
        toPaddockId: SEED_IDS.areas.pasto6,
        occurredAt: '2026-03-16T12:00:00.000Z',
        idempotencyKey: `rejected-${check}`,
        ...changes,
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as { check: string }).check).toBe(check),
      );

    expect(testApp.repositories.cattle.listMovements()).toHaveLength(0);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(0);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(0);
    expect(testApp.repositories.cattle.listIdempotencyKeys()).toHaveLength(0);
  });

  it('rejects an inactive destination before writing', async () => {
    testApp.repositories.cattle.updatePaddock(
      SEED_IDS.farms.santaClara,
      SEED_IDS.areas.pasto6,
      { active: false },
    );

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send({
        lotId: SEED_IDS.lots.recria,
        fromPaddockId: SEED_IDS.areas.pasto4,
        toPaddockId: SEED_IDS.areas.pasto6,
        occurredAt: '2026-03-16T12:00:00.000Z',
        idempotencyKey: 'inactive-destination',
      })
      .expect(409)
      .expect(({ body }) =>
        expect((body as { check: string }).check).toBe(
          'movement.destination_active',
        ),
      );

    expect(testApp.repositories.cattle.listMovements()).toHaveLength(0);
    expect(testApp.repositories.cattle.listIdempotencyKeys()).toHaveLength(0);
  });

  it('refuses to reuse an idempotency key for a different command', async () => {
    const command = {
      lotId: SEED_IDS.lots.recria,
      fromPaddockId: SEED_IDS.areas.pasto4,
      toPaddockId: SEED_IDS.areas.pasto6,
      occurredAt: '2026-03-16T12:00:00.000Z',
      idempotencyKey: 'same-key-different-request',
    };
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send(command)
      .expect(201);

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send({ ...command, reason: 'A different command' })
      .expect(409)
      .expect(({ body }) =>
        expect((body as { check: string }).check).toBe(
          'movement.idempotency_key_reused',
        ),
      );

    expect(testApp.repositories.cattle.listMovements()).toHaveLength(1);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(1);
  });

  it('rolls every movement write back when a later write fails', async () => {
    testApp.repositories.cattle.createMovementEvent.mockRejectedValueOnce(
      new Error('outbox unavailable'),
    );

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send({
        lotId: SEED_IDS.lots.recria,
        fromPaddockId: SEED_IDS.areas.pasto4,
        toPaddockId: SEED_IDS.areas.pasto6,
        occurredAt: '2026-03-16T12:00:00.000Z',
        idempotencyKey: 'movement-that-rolls-back',
      })
      .expect(500);

    expect(testApp.repositories.cattle.listMovements()).toHaveLength(0);
    expect(testApp.repositories.cattle.listDomainEvents()).toHaveLength(0);
    expect(testApp.repositories.cattle.listOutboxMessages()).toHaveLength(0);
    expect(testApp.repositories.cattle.listIdempotencyKeys()).toHaveLength(0);
    expect(
      testApp.repositories.cattle.findOpenOccupancy(SEED_IDS.lots.recria),
    ).toEqual(expect.objectContaining({ paddockId: SEED_IDS.areas.pasto4 }));
  });

  it('uses one strict command schema for HTTP and derives the agent schema without farmId', async () => {
    expect(
      moveCattleLotCommandSchema.safeParse({
        farmId: SEED_IDS.farms.santaClara,
      }).success,
    ).toBe(false);
    expect(Object.keys(moveCattleLotAgentInputSchema.shape)).not.toContain(
      'farmId',
    );

    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements')
      .send({
        lotId: SEED_IDS.lots.recria,
        fromPaddockId: SEED_IDS.areas.pasto4,
        toPaddockId: SEED_IDS.areas.pasto6,
        occurredAt: 'not-a-date',
        idempotencyKey: 'invalid-movement',
        farmId: SEED_IDS.farms.boaVista,
      })
      .expect(400);
  });
});
