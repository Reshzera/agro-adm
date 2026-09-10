import { SEED_IDS } from '../../src/seed/santa-clara';
import { createTestApp, type TestApp } from '../test-setups/test-app';

describe('authentication', () => {
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

  it('does not allow protected routes without a verified session', async () => {
    await testApp.request().get('/profile').expect(401);
  });

  it('hides resources from another farm with a 404 response', async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .get(`/farms/${SEED_IDS.farms.boaVista}`)
      .expect(404);
  });

  it('resolves the farm context through the auth repository', async () => {
    await testApp.as(SEED_IDS.users.joao).get('/profile').expect(200);

    expect(testApp.repositories.auth.findFarmIdForUser).toHaveBeenCalledWith(
      SEED_IDS.users.joao,
    );
  });

  it('updates the profile name, email, and phone number', async () => {
    const response = await testApp
      .as(SEED_IDS.users.joao)
      .patch('/profile')
      .send({
        name: 'João da Silva',
        email: 'joao.silva@santaclara.test',
        phone: '+5567999991111',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'João da Silva',
      email: 'joao.silva@santaclara.test',
      phone: '+5567999991111',
      emailVerified: false,
    });
  });

  it('validates profile updates through the DTO', async () => {
    await testApp
      .as(SEED_IDS.users.joao)
      .patch('/profile')
      .send({ email: 'not-an-email' })
      .expect(400);
  });
});
