import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

type FarmResponse = {
  onboardingCompleted: boolean;
};

describe('farm', () => {
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

  it('returns and manually updates every field collected by onboarding', async () => {
    const response = await testApp
      .as(SEED_IDS.users.joao)
      .patch('/farms')
      .send({
        name: 'Estância Horizonte',
        totalAreaHa: '615.50',
        location: 'Aquidauana, MS',
        primaryActivity: 'Mista',
        mainCrops: 'Soja, milho e sorgo',
        approximateAnimalCount: 540,
        agentContext: '# Estância Horizonte\n\n- Ana é a gerente.',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        name: 'Estância Horizonte',
        totalAreaHa: '615.50',
        location: 'Aquidauana, MS',
        primaryActivity: 'Mista',
        mainCrops: 'Soja, milho e sorgo',
        approximateAnimalCount: 540,
        agentContext: '# Estância Horizonte\n\n- Ana é a gerente.',
        onboardingCompleted: true,
      }),
    );

    const current = await testApp
      .as(SEED_IDS.users.joao)
      .get('/farms')
      .expect(200);
    expect(current.body).toEqual(response.body);
  });

  it('derives onboarding completion from essential fields', async () => {
    const incomplete = await testApp
      .as(SEED_IDS.users.joao)
      .patch('/farms')
      .send({ location: null })
      .expect(200);
    expect((incomplete.body as FarmResponse).onboardingCompleted).toBe(false);

    const complete = await testApp
      .as(SEED_IDS.users.joao)
      .patch('/farms')
      .send({ location: 'Camapuã, MS' })
      .expect(200);
    expect((complete.body as FarmResponse).onboardingCompleted).toBe(true);
  });

  it('does not allow an owner to read or update another farm', async () => {
    await testApp
      .as(SEED_IDS.users.marina)
      .get(`/farms/${SEED_IDS.farms.santaClara}`)
      .expect(404);
    await testApp
      .as(SEED_IDS.users.marina)
      .patch(`/farms/${SEED_IDS.farms.santaClara}`)
      .send({ name: 'Tentativa' })
      .expect(404);
  });
});
