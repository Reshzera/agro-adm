import { SEED_IDS } from '../../src/seed/santa-clara';
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
});
