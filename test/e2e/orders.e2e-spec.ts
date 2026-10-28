import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { cleanDatabase } from './db-cleanup';

process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();
let app: INestApplication;

const superadmin = {
  email: 'e2e-orders-superadmin@comanda.test',
  password: 'Superadmin123!',
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

async function login(email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return (response.body as { accessToken: string }).accessToken;
}

async function createRestaurant(
  accessToken: string,
  slug: string,
  adminEmail: string,
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/restaurantes')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: `Restaurante ${slug}`,
      slug,
      currency: 'COP',
      timezone: 'America/Bogota',
      adminEmail,
      adminPassword: 'Admin123!',
      adminFullName: `Admin ${slug}`,
    })
    .expect(201);

  return response.body as { id: string };
}

async function createUser(accessToken: string, email: string, role: Role): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/usuarios')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      email,
      password: 'Staff123!',
      fullName: `Usuario ${role}`,
      role,
    })
    .expect(201);

  return response.body as { id: string };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  if (!/test/i.test(process.env.DATABASE_URL ?? '')) {
    throw new Error('DATABASE_URL debe apuntar a una base de datos de prueba');
  }

  await cleanDatabase(prisma);

  const passwordHash = await argon2.hash(superadmin.password, {
    type: argon2.argon2id,
  });

  await prisma.user.create({
    data: {
      email: superadmin.email,
      passwordHash,
      fullName: 'Superadmin Pedidos E2E',
      role: Role.SUPERADMIN,
      restaurantId: null,
    },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
});

describe('Pedidos (e2e)', () => {
  const suffix = uniqueSuffix();
  const slugA = `orders-a-${suffix}`;
  const slugB = `orders-b-${suffix}`;
  const adminAEmail = `orders-admin-a-${suffix}@test.com`;
  const adminBEmail = `orders-admin-b-${suffix}@test.com`;
  const waiterAEmail = `orders-waiter-a-${suffix}@test.com`;
  const kitchenAEmail = `orders-kitchen-a-${suffix}@test.com`;
  const waiterBEmail = `orders-waiter-b-${suffix}@test.com`;

  let superadminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAToken: string;
  let kitchenAToken: string;
  let waiterBToken: string;
  let waiterAId: string;

  let zoneId: string;
  let table1Id: string;
  let table2Id: string;
  let table3Id: string;
  let table4Id: string;

  let nachosId: string;
  let personalVariantId: string;
  let beerId: string;
  let sopaId: string;
  let flanId: string;
  let quesoId: string;

  let order1Id: string;
  let order2Id: string;
  let order3Id: string;

  let nachosItemId: string;
  let beerItemId: string;
  let sopaItemId: string;

  beforeAll(async () => {
    superadminToken = await login(superadmin.email, superadmin.password);

    await createRestaurant(superadminToken, slugA, adminAEmail);
    await createRestaurant(superadminToken, slugB, adminBEmail);

    adminAToken = await login(adminAEmail, 'Admin123!');
    adminBToken = await login(adminBEmail, 'Admin123!');

    waiterAId = (await createUser(adminAToken, waiterAEmail, Role.WAITER)).id;
    await createUser(adminAToken, kitchenAEmail, Role.KITCHEN);
    await createUser(adminBToken, waiterBEmail, Role.WAITER);

    waiterAToken = await login(waiterAEmail, 'Staff123!');
    kitchenAToken = await login(kitchenAEmail, 'Staff123!');
    waiterBToken = await login(waiterBEmail, 'Staff123!');

    const category = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Comida', sortOrder: 1 })
      .expect(201);
    const categoryId = (category.body as { id: string }).id;

    const nachos = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Nachos',
        basePrice: 18000,
        preparationArea: 'KITCHEN',
      })
      .expect(201);
    nachosId = (nachos.body as { id: string }).id;

    const personal = await request(app.getHttpServer())
      .post(`/productos/${nachosId}/variantes`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Personal', price: 18000, sortOrder: 1 })
      .expect(201);
    personalVariantId = (personal.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/productos/${nachosId}/variantes`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Compartir', price: 32000, sortOrder: 2 })
      .expect(201);

    const group = await request(app.getHttpServer())
      .post('/grupos-modificadores')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Adiciones', minSelections: 0, maxSelections: 2 })
      .expect(201);
    const groupId = (group.body as { id: string }).id;

    const queso = await request(app.getHttpServer())
      .post(`/grupos-modificadores/${groupId}/modificadores`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Queso extra', extraPrice: 2000 })
      .expect(201);
    quesoId = (queso.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/productos/${nachosId}/grupos-modificadores`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ groupId })
      .expect(201);

    const beer = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Cerveza artesanal',
        basePrice: 12000,
        preparationArea: 'BAR',
      })
      .expect(201);
    beerId = (beer.body as { id: string }).id;

    const sopa = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Sopa del día',
        basePrice: 8000,
        preparationArea: 'KITCHEN',
      })
      .expect(201);
    sopaId = (sopa.body as { id: string }).id;

    const flan = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Flan',
        basePrice: 9000,
        preparationArea: 'KITCHEN',
      })
      .expect(201);
    flanId = (flan.body as { id: string }).id;

    const zone = await request(app.getHttpServer())
      .post('/zonas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Salón principal', sortOrder: 1 })
      .expect(201);
    zoneId = (zone.body as { id: string }).id;

    const tableNames = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4'];
    const tableIds: string[] = [];
    for (const name of tableNames) {
      const table = await request(app.getHttpServer())
        .post('/mesas')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ zoneId, name, capacity: 4 })
        .expect(201);
      tableIds.push((table.body as { id: string }).id);
    }

    [table1Id, table2Id, table3Id, table4Id] = tableIds as [string, string, string, string];
  });

  it('configura zonas y mesas y respeta los roles', async () => {
    const zones = await request(app.getHttpServer())
      .get('/zonas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    expect((zones.body as { meta: { total: number } }).meta.total).toBe(1);

    const tables = await request(app.getHttpServer())
      .get('/mesas')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);

    const body = tables.body as {
      data: Array<{ name: string; status: string; zone: { name: string } }>;
    };
    expect(body.data).toHaveLength(4);
    expect(body.data[0]).toMatchObject({
      name: 'Mesa 1',
      status: 'FREE',
      zone: { name: 'Salón principal' },
    });

    await request(app.getHttpServer())
      .delete(`/zonas/${zoneId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .post('/zonas')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ name: 'Intrusa' })
      .expect(403);

    const terraza = await request(app.getHttpServer())
      .post('/zonas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Terraza' })
      .expect(201);
    const terrazaId = (terraza.body as { id: string }).id;

    await request(app.getHttpServer())
      .delete(`/zonas/${terrazaId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/mesas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ zoneId: terrazaId, name: 'Mesa terraza', capacity: 2 })
      .expect(409);
  });

  it('abre una mesa y crea un pedido abierto por mesa', async () => {
    const opened = await request(app.getHttpServer())
      .post(`/mesas/${table1Id}/abrir`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ comensales: 2 })
      .expect(201);

    order1Id = (opened.body as { id: string }).id;
    expect(opened.body).toMatchObject({
      tableId: table1Id,
      status: 'OPEN',
      guests: 2,
      waiterId: waiterAId,
      table: { status: 'OCCUPIED', name: 'Mesa 1' },
      total: 0,
    });
    expect((opened.body as { items: unknown[] }).items).toHaveLength(0);

    const table = await request(app.getHttpServer())
      .get(`/mesas/${table1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);

    expect((table.body as { status: string }).status).toBe('OCCUPIED');
    expect((table.body as { orders: Array<{ id: string }> }).orders[0]?.id).toBe(order1Id);

    await request(app.getHttpServer())
      .post(`/mesas/${table1Id}/abrir`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ comensales: 2 })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/mesas/${table1Id}/abrir`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .send({ comensales: 2 })
      .expect(403);
  });

  it('agrega ítems con snapshot de precio, variante y modificadores', async () => {
    const response = await request(app.getHttpServer())
      .post(`/pedidos/${order1Id}/items`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        items: [
          {
            productoId: nachosId,
            varianteId: personalVariantId,
            cantidad: 2,
            modificadores: [{ modificadorId: quesoId, cantidad: 1 }],
            notas: 'Sin cebolla',
          },
          { productoId: beerId, cantidad: 1 },
        ],
      })
      .expect(201);

    const body = response.body as {
      total: number;
      items: Array<{
        id: string;
        productNameSnapshot: string;
        variantNameSnapshot: string | null;
        quantity: number;
        unitPrice: number;
        modifiersTotal: number;
        lineTotal: number;
        notes: string | null;
        preparationArea: string;
        status: string;
        modifiers: Array<{
          nameSnapshot: string;
          extraPrice: number;
          quantity: number;
        }>;
      }>;
    };

    expect(body.total).toBe(52000);
    expect(body.items).toHaveLength(2);

    const nachos = body.items.find((item) => item.productNameSnapshot === 'Nachos');
    expect(nachos).toBeDefined();
    nachosItemId = nachos!.id;
    expect(nachos).toMatchObject({
      variantNameSnapshot: 'Personal',
      quantity: 2,
      unitPrice: 18000,
      modifiersTotal: 4000,
      lineTotal: 40000,
      notes: 'Sin cebolla',
      preparationArea: 'KITCHEN',
      status: 'PENDING',
      modifiers: [
        expect.objectContaining({ nameSnapshot: 'Queso extra', extraPrice: 2000, quantity: 1 }),
      ],
    });

    const beer = body.items.find((item) => item.productNameSnapshot === 'Cerveza artesanal');
    expect(beer).toBeDefined();
    beerItemId = beer!.id;
    expect(beer).toMatchObject({
      variantNameSnapshot: null,
      quantity: 1,
      unitPrice: 12000,
      modifiersTotal: 0,
      lineTotal: 12000,
      preparationArea: 'BAR',
      status: 'PENDING',
    });
  });

  it('crea un pedido completo directamente en otra mesa', async () => {
    await delay(25);

    const response = await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table2Id,
        comensales: 1,
        items: [{ productoId: sopaId, cantidad: 1 }],
      })
      .expect(201);

    order2Id = (response.body as { id: string }).id;
    const body = response.body as {
      total: number;
      items: Array<{ id: string; productNameSnapshot: string; status: string }>;
    };
    expect(body.total).toBe(8000);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      productNameSnapshot: 'Sopa del día',
      status: 'PENDING',
    });
    sopaItemId = body.items[0]!.id;

    const table = await request(app.getHttpServer())
      .get(`/mesas/${table2Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((table.body as { status: string }).status).toBe('OCCUPIED');
    expect((table.body as { orders: Array<{ id: string }> }).orders[0]?.id).toBe(order2Id);

    await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table2Id,
        comensales: 1,
        items: [{ productoId: beerId, cantidad: 1 }],
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: table2Id, comensales: 0, items: [] })
      .expect(400);
  });

  it('valida disponibilidad, variantes y reglas de modificadores', async () => {
    await request(app.getHttpServer())
      .patch(`/productos/${flanId}/disponibilidad`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isAvailable: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table3Id,
        comensales: 1,
        items: [{ productoId: flanId, cantidad: 1 }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table3Id,
        comensales: 1,
        items: [{ productoId: nachosId, cantidad: 1 }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table3Id,
        comensales: 1,
        items: [
          {
            productoId: nachosId,
            varianteId: personalVariantId,
            cantidad: 1,
            modificadores: [{ modificadorId: quesoId, cantidad: 3 }],
          },
        ],
      })
      .expect(400);

    const table = await request(app.getHttpServer())
      .get(`/mesas/${table3Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((table.body as { status: string }).status).toBe('FREE');
    expect((table.body as { orders: unknown[] }).orders).toHaveLength(0);
  });

  it('aísla pedidos y mesas entre restaurantes', async () => {
    await request(app.getHttpServer())
      .get(`/pedidos/${order1Id}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/mesas/${table1Id}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/mesas/${table1Id}/abrir`)
      .set('Authorization', `Bearer ${waiterBToken}`)
      .send({ comensales: 2 })
      .expect(404);

    await request(app.getHttpServer()).get(`/pedidos/${order1Id}`).expect(401);

    await request(app.getHttpServer())
      .get(`/pedidos/${order1Id}`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .expect(403);
  });

  it('enruta por área y ordena la cola por antigüedad', async () => {
    const kitchen = await request(app.getHttpServer())
      .get('/areas/KITCHEN/items-pendientes')
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .expect(200);

    const kitchenBody = kitchen.body as {
      data: Array<{
        id: string;
        productNameSnapshot: string;
        preparationArea: string;
        order: { table: { name: string } };
      }>;
      meta: { total: number };
    };

    expect(kitchenBody.meta.total).toBe(2);
    expect(kitchenBody.data.map((item) => item.productNameSnapshot)).toEqual([
      'Nachos',
      'Sopa del día',
    ]);
    expect(kitchenBody.data.every((item) => item.preparationArea === 'KITCHEN')).toBe(true);
    expect(kitchenBody.data[0]!.order.table.name).toBe('Mesa 1');
    expect(kitchenBody.data[1]!.order.table.name).toBe('Mesa 2');

    const bar = await request(app.getHttpServer())
      .get('/areas/BAR/items-pendientes')
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .expect(200);

    const barBody = bar.body as {
      data: Array<{ productNameSnapshot: string; preparationArea: string }>;
    };
    expect(barBody.data).toHaveLength(1);
    expect(barBody.data[0]).toMatchObject({
      productNameSnapshot: 'Cerveza artesanal',
      preparationArea: 'BAR',
    });

    await request(app.getHttpServer())
      .get('/areas/KITCHEN/items-pendientes')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/areas/PLANCHA/items-pendientes')
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .expect(400);
  });

  it('aplica transiciones válidas y rechaza las inválidas', async () => {
    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${nachosItemId}/estado`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ estado: 'READY' })
      .expect(400);

    const sent = await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${nachosItemId}/estado`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ estado: 'IN_PREPARATION' })
      .expect(200);

    expect(sent.body).toMatchObject({ status: 'IN_PREPARATION' });
    expect((sent.body as { sentAt: string | null }).sentAt).toBeTruthy();
    expect((sent.body as { startedAt: string | null }).startedAt).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${nachosItemId}/estado`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ estado: 'READY' })
      .expect(403);

    const ready = await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${nachosItemId}/estado`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .send({ estado: 'READY' })
      .expect(200);

    expect(ready.body).toMatchObject({ status: 'READY' });
    expect((ready.body as { readyAt: string | null }).readyAt).toBeTruthy();
    expect(
      (ready.body as { preparationSeconds: number | null }).preparationSeconds,
    ).toBeGreaterThanOrEqual(0);

    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${beerItemId}/estado`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .send({ estado: 'READY' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${beerItemId}/estado`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ estado: 'IN_PREPARATION' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${beerItemId}/estado`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .send({ estado: 'READY' })
      .expect(200);

    const served = await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${beerItemId}/estado`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ estado: 'SERVED' })
      .expect(200);

    expect(served.body).toMatchObject({ status: 'SERVED' });
    expect((served.body as { servedAt: string | null }).servedAt).toBeTruthy();

    await request(app.getHttpServer())
      .patch(`/pedidos/${order1Id}/items/${beerItemId}/estado`)
      .set('Authorization', `Bearer ${kitchenAToken}`)
      .send({ estado: 'READY' })
      .expect(400);
  });

  it('cancela ítems con motivo y exige administrador para los servidos', async () => {
    const cancelled = await request(app.getHttpServer())
      .post(`/pedidos/${order2Id}/items/${sopaItemId}/cancelar`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ motivo: 'El cliente canceló la sopa' })
      .expect(201);

    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'El cliente canceló la sopa',
      cancelledById: waiterAId,
    });
    expect((cancelled.body as { cancelledAt: string | null }).cancelledAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/pedidos/${order1Id}/items/${beerItemId}/cancelar`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ motivo: 'Ya estaba servida' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/pedidos/${order1Id}/items/${beerItemId}/cancelar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ motivo: 'Cobro anulado por el administrador' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/pedidos/${order1Id}/items/${beerItemId}/cancelar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ motivo: 'Repetida' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/pedidos/${order2Id}/items/${sopaItemId}/cancelar`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ motivo: 'x' })
      .expect(400);

    const order1 = await request(app.getHttpServer())
      .get(`/pedidos/${order1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((order1.body as { total: number }).total).toBe(40000);
    expect((order1.body as { status: string }).status).toBe('OPEN');

    const order2 = await request(app.getHttpServer())
      .get(`/pedidos/${order2Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((order2.body as { total: number }).total).toBe(0);
  });

  it('mantiene congelados los precios aunque cambie la carta', async () => {
    await request(app.getHttpServer())
      .patch(`/productos/${nachosId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ basePrice: 25000 })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/productos/${nachosId}/variantes/${personalVariantId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ price: 25000 })
      .expect(200);

    const frozen = await request(app.getHttpServer())
      .get(`/pedidos/${order1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);

    const nachos = (
      frozen.body as {
        items: Array<{ productNameSnapshot: string; unitPrice: number; lineTotal: number }>;
      }
    ).items.find((item) => item.productNameSnapshot === 'Nachos');
    expect(nachos).toMatchObject({ unitPrice: 18000, lineTotal: 40000 });

    const created = await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({
        mesaId: table3Id,
        comensales: 1,
        items: [
          {
            productoId: nachosId,
            varianteId: personalVariantId,
            cantidad: 1,
          },
        ],
      })
      .expect(201);

    order3Id = (created.body as { id: string }).id;
    const newItem = (created.body as { items: Array<{ unitPrice: number; lineTotal: number }> })
      .items[0];
    expect(newItem).toMatchObject({ unitPrice: 25000, lineTotal: 25000 });
    expect((created.body as { total: number }).total).toBe(25000);
  });

  it('mueve un pedido a otra mesa libre', async () => {
    const moved = await request(app.getHttpServer())
      .post(`/pedidos/${order3Id}/mover`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: table4Id })
      .expect(201);

    expect(moved.body).toMatchObject({
      tableId: table4Id,
      table: { name: 'Mesa 4', status: 'OCCUPIED' },
    });

    const source = await request(app.getHttpServer())
      .get(`/mesas/${table3Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect(source.body).toMatchObject({ status: 'FREE', orders: [] });

    const target = await request(app.getHttpServer())
      .get(`/mesas/${table4Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((target.body as { status: string }).status).toBe('OCCUPIED');
    expect((target.body as { orders: Array<{ id: string }> }).orders[0]?.id).toBe(order3Id);

    await request(app.getHttpServer())
      .post(`/pedidos/${order3Id}/mover`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: table4Id })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/pedidos/${order3Id}/mover`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: table1Id })
      .expect(409);
  });

  it('une pedidos y libera la mesa de origen', async () => {
    const merged = await request(app.getHttpServer())
      .post(`/pedidos/${order3Id}/unir`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ pedidoDestinoId: order1Id })
      .expect(201);

    const body = merged.body as {
      id: string;
      total: number;
      items: Array<{ productNameSnapshot: string }>;
    };
    expect(body.id).toBe(order1Id);
    expect(body.items).toHaveLength(3);
    expect(body.total).toBe(65000);

    const source = await request(app.getHttpServer())
      .get(`/pedidos/${order3Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((source.body as { status: string }).status).toBe('CANCELLED');

    const table = await request(app.getHttpServer())
      .get(`/mesas/${table4Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect(table.body).toMatchObject({ status: 'FREE', orders: [] });

    await request(app.getHttpServer())
      .post(`/pedidos/${order3Id}/unir`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ pedidoDestinoId: order1Id })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/pedidos/${order1Id}/unir`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ pedidoDestinoId: order1Id })
      .expect(400);
  });

  it('lista pedidos con filtros de estado y mesa', async () => {
    const open = await request(app.getHttpServer())
      .get('/pedidos?estado=OPEN')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    const openBody = open.body as { data: Array<{ id: string }> };
    expect(openBody.data.map((order) => order.id)).toEqual(
      expect.arrayContaining([order1Id, order2Id]),
    );
    expect(openBody.data.some((order) => order.id === order3Id)).toBe(false);

    const byTable = await request(app.getHttpServer())
      .get(`/pedidos?mesaId=${table1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((byTable.body as { data: Array<{ id: string }> }).data).toHaveLength(1);
    expect((byTable.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(order1Id);

    const cancelled = await request(app.getHttpServer())
      .get('/pedidos?estado=CANCELLED')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((cancelled.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(order3Id);
  });
});
