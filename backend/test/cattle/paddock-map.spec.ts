import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

type BoundaryResponse = {
  id: string;
  usableAreaHa: string | null;
  boundary: {
    space: string;
    version: number;
    points: [number, number][];
    computedAreaHa: string | null;
  } | null;
  areaDivergence: {
    computedAreaHa: string;
    usableAreaHa: string;
    differencePercent: number;
    significant: boolean;
  } | null;
};

type PreviewResponse = {
  destination: { capacity: number | null; capacitySource: string };
};

const TRACED_PASTURE: [number, number][] = [
  [-54.111902, -19.519397],
  [-54.103268, -19.518559],
  [-54.101698, -19.524424],
  [-54.110724, -19.525542],
];

describe('paddock boundaries on the map', () => {
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

  it('draws a boundary in real coordinates and re-edits it vertex by vertex', async () => {
    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/paddocks')
      .send({
        name: 'Pasto 8',
        usableAreaHa: '58.00',
        boundary: { space: 'geo', points: TRACED_PASTURE },
      })
      .expect(201);

    const paddock = created.body as BoundaryResponse;
    expect(paddock.boundary).toEqual({
      space: 'geo',
      version: 1,
      points: TRACED_PASTURE,
      computedAreaHa: '63.50',
    });

    const dragged: [number, number][] = [
      [-54.112, -19.5194],
      ...TRACED_PASTURE.slice(1),
    ];
    const edited = await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/paddocks/${paddock.id}`)
      .send({ boundary: { space: 'geo', points: dragged } })
      .expect(200);

    expect((edited.body as BoundaryResponse).boundary?.points).toEqual(dragged);

    const cleared = await testApp
      .as(SEED_IDS.users.joao)
      .patch(`/cattle/paddocks/${paddock.id}`)
      .send({ boundary: null })
      .expect(200);

    expect((cleared.body as BoundaryResponse).boundary).toBeNull();
  });

  it('shows the traced area beside the producer figure without correcting it', async () => {
    const created = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/paddocks')
      .send({
        name: 'Pasto 9',
        usableAreaHa: '40.00',
        boundary: { space: 'geo', points: TRACED_PASTURE },
      })
      .expect(201);

    const paddock = created.body as BoundaryResponse;
    expect(paddock.usableAreaHa).toBe('40.00');
    expect(paddock.boundary?.computedAreaHa).toBe('63.50');
    expect(paddock.areaDivergence).toEqual({
      computedAreaHa: '63.50',
      usableAreaHa: '40.00',
      differencePercent: 58.8,
      significant: true,
    });
  });

  it('keeps the rules on the producer figure even where the traced area is much larger', async () => {
    const preview = await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/movements/preview')
      .send({
        lotId: SEED_IDS.lots.bezerros,
        fromPaddockId: SEED_IDS.areas.pasto5,
        toPaddockId: SEED_IDS.areas.pasto6,
        occurredAt: '2026-03-16T12:00:00.000Z',
      })
      .expect(200);

    const paddocks = await testApp
      .as(SEED_IDS.users.joao)
      .get('/cattle/paddocks')
      .expect(200);
    const pasto6 = (paddocks.body as BoundaryResponse[]).find(
      (paddock) => paddock.id === SEED_IDS.areas.pasto6,
    )!;

    expect(pasto6.usableAreaHa).toBe('49.00');
    expect(pasto6.boundary?.computedAreaHa).toBe('52.79');
    expect((preview.body as PreviewResponse).destination).toEqual(
      expect.objectContaining({ capacity: 49 * 1.8, capacitySource: 'FARM' }),
    );
  });

  it('still loads a paddock whose boundary was drawn over an uploaded image', async () => {
    testApp.repositories.cattle.updatePaddock(
      SEED_IDS.farms.santaClara,
      SEED_IDS.areas.pasto4,
      {
        shape: {
          space: 'image',
          version: 1,
          points: [
            [0.12, 0.18],
            [0.34, 0.15],
            [0.38, 0.36],
          ],
        },
      },
    );

    const paddocks = await testApp
      .as(SEED_IDS.users.joao)
      .get('/cattle/paddocks')
      .expect(200);

    const pasto4 = (paddocks.body as BoundaryResponse[]).find(
      (paddock) => paddock.id === SEED_IDS.areas.pasto4,
    )!;
    expect(pasto4.boundary).toEqual(
      expect.objectContaining({ space: 'image', computedAreaHa: null }),
    );
    expect(pasto4.areaDivergence).toBeNull();
  });

  it.each([
    [
      'a shape relative to an uploaded image',
      { space: 'image', points: TRACED_PASTURE },
    ],
    [
      'a line instead of an area',
      { space: 'geo', points: TRACED_PASTURE.slice(0, 2) },
    ],
    [
      'a point off the mapped world',
      { space: 'geo', points: [...TRACED_PASTURE.slice(1), [-54.06, -95]] },
    ],
    [
      'a vertex that is not a coordinate pair',
      { space: 'geo', points: [...TRACED_PASTURE.slice(1), ['x', 'y']] },
    ],
  ])('refuses %s', async (_case, boundary) => {
    await testApp
      .as(SEED_IDS.users.joao)
      .post('/cattle/paddocks')
      .send({ name: 'Pasto recusado', boundary })
      .expect(400);
  });
});
