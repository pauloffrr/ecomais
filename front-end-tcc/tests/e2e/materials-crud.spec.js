const { expect, test } = require('@playwright/test');

const userPayload = {
  full_name: 'Playwright Materials',
  email: 'playwright.materials@example.com',
  cpf: '39053344705',
  phone: '11987654321',
  password: 'Senha123',
};

const materialPayload = {
  name: 'Playwright PET Bottle',
  category: 'plastic',
  points_per_kg: 120,
  min_weight_grams: 10,
  ai_class_name: 'playwright_plastic_pet',
  confidence_threshold: 0.75,
  is_recyclable: true,
  description: 'Material created by Playwright E2E',
  is_active: true,
};

test.describe('materials CRUD API', () => {
  test('requires authentication for material catalog access', async ({ request }) => {
    const response = await request.get('/v1/materials');

    expect(response.status()).toBe(401);
  });

  test('registers, logs in, and completes the materials CRUD lifecycle', async ({ request }) => {
    const registerResponse = await request.post('/v1/auth/register', {
      data: userPayload,
    });
    expect(registerResponse.status()).toBe(201);

    const loginResponse = await request.post('/v1/auth/login', {
      form: {
        username: userPayload.email,
        password: userPayload.password,
      },
    });
    expect(loginResponse.status()).toBe(200);

    const token = (await loginResponse.json()).access_token;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    const createResponse = await request.post('/v1/materials', {
      headers: authHeaders,
      data: materialPayload,
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.name).toBe(materialPayload.name);
    expect(created.ai_class_name).toBe(materialPayload.ai_class_name);

    const materialId = created.id;

    const getResponse = await request.get(`/v1/materials/${materialId}`, {
      headers: authHeaders,
    });
    expect(getResponse.status()).toBe(200);
    expect((await getResponse.json()).id).toBe(materialId);

    const updateResponse = await request.put(`/v1/materials/${materialId}`, {
      headers: authHeaders,
      data: {
        name: 'Playwright Recycled PET Bottle',
        points_per_kg: 150,
        description: 'Updated by Playwright E2E',
      },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.name).toBe('Playwright Recycled PET Bottle');
    expect(updated.points_per_kg).toBe(150);

    const listResponse = await request.get('/v1/materials', {
      headers: authHeaders,
    });
    expect(listResponse.status()).toBe(200);
    const activeCatalog = await listResponse.json();
    expect(activeCatalog.total).toBe(1);
    expect(activeCatalog.materials[0].id).toBe(materialId);

    const deleteResponse = await request.delete(`/v1/materials/${materialId}`, {
      headers: authHeaders,
    });
    expect(deleteResponse.status()).toBe(204);

    const activeListAfterDelete = await request.get('/v1/materials', {
      headers: authHeaders,
    });
    expect(activeListAfterDelete.status()).toBe(200);
    expect(await activeListAfterDelete.json()).toEqual({ materials: [], total: 0 });

    const completeListResponse = await request.get('/v1/materials?active_only=false', {
      headers: authHeaders,
    });
    expect(completeListResponse.status()).toBe(200);
    const completeCatalog = await completeListResponse.json();
    expect(completeCatalog.total).toBe(1);
    expect(completeCatalog.materials[0].is_active).toBe(false);
  });
});
