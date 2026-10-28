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
  email: 'e2e-accounts-superadmin@comanda.test',
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

interface AccountDetail {
  id: string;
  estado: string;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  propina: number;
  total: number;
  pagado: number;
  saldo: number;
  propinaBps: number;
  propinaSugeridaBps: number;
  propinaHabilitada: boolean;
  preciosIncluyenImpuesto: boolean;
  lineas: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    descuento: number;
    neto: number;
  }>;
  impuestosDetalle: Array<{ nombre: string; tasaBps: number; monto: number }>;
  descuentosDetalle: Array<{
    itemId: string | null;
    alcance: string;
    tipo: string;
    valor: number;
    motivo: string;
    aprobado: boolean;
    aprobadoPor: { id: string; fullName: string } | null;
  }>;
  pagos: Array<{
    metodo: string;
    monto: number;
    division: string | null;
  }>;
  divisiones: Array<{
    id: string;
    etiqueta: string;
    monto: number;
    items: Array<{ itemId: string; cantidad: number; monto: number }>;
  }>;
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
      fullName: 'Superadmin Cuentas E2E',
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

describe('Cuentas, impuestos y configuración (e2e)', () => {
  const suffix = uniqueSuffix();
  const slugA = `accounts-a-${suffix}`;
  const slugB = `accounts-b-${suffix}`;
  const adminAEmail = `accounts-admin-a-${suffix}@test.com`;
  const adminBEmail = `accounts-admin-b-${suffix}@test.com`;
  const waiterAEmail = `accounts-waiter-a-${suffix}@test.com`;
  const cashierAEmail = `accounts-cashier-a-${suffix}@test.com`;
  const cashierBEmail = `accounts-cashier-b-${suffix}@test.com`;

  let superadminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAToken: string;
  let cashierAToken: string;
  let cashierBToken: string;
  let cashierAId: string;

  let categoryId: string;
  let nachosId: string;
  let beerId: string;
  let zoneId: string;
  let table1Id: string;
  let table2Id: string;
  let table3Id: string;
  let table4Id: string;

  let order1Id: string;
  let account1Id: string;
  let nachosItem1Id: string;

  let order2Id: string;
  let account2Id: string;
  let beerItem2Id: string;

  let account3Id: string;
  let account4Id: string;

  beforeAll(async () => {
    superadminToken = await login(superadmin.email, superadmin.password);

    await createRestaurant(superadminToken, slugA, adminAEmail);
    await createRestaurant(superadminToken, slugB, adminBEmail);

    adminAToken = await login(adminAEmail, 'Admin123!');
    adminBToken = await login(adminBEmail, 'Admin123!');

    await createUser(adminAToken, waiterAEmail, Role.WAITER);
    cashierAId = (await createUser(adminAToken, cashierAEmail, Role.CASHIER)).id;
    await createUser(adminBToken, cashierBEmail, Role.CASHIER);

    waiterAToken = await login(waiterAEmail, 'Staff123!');
    cashierAToken = await login(cashierAEmail, 'Staff123!');
    cashierBToken = await login(cashierBEmail, 'Staff123!');

    const category = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Comida', sortOrder: 1 })
      .expect(201);
    categoryId = (category.body as { id: string }).id;

    const nachos = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Nachos',
        basePrice: 24000,
        preparationArea: 'KITCHEN',
      })
      .expect(201);
    nachosId = (nachos.body as { id: string }).id;

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

    await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ nombre: 'IVA', tasaBps: 1900, orden: 1 })
      .expect(201);
  });

  async function createOrder(
    tableId: string,
    items: Array<{ productoId: string; cantidad: number }>,
  ): Promise<{ orderId: string; itemIds: string[] }> {
    const response = await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: tableId, comensales: 3, items })
      .expect(201);

    const body = response.body as { id: string; items: Array<{ id: string }> };
    return { orderId: body.id, itemIds: body.items.map((item) => item.id) };
  }

  async function getAccountByTable(tableId: string): Promise<AccountDetail> {
    const response = await request(app.getHttpServer())
      .get(`/cuentas?mesaId=${tableId}`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(200);

    return response.body as AccountDetail;
  }

  it('configura impuestos y la cuenta se crea junto con el pedido', async () => {
    const config = await request(app.getHttpServer())
      .get('/restaurantes/me/configuracion-cuenta')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(config.body).toEqual({
      preciosIncluyenImpuesto: false,
      propinaHabilitada: true,
      propinaSugeridaBps: 1000,
      basePropina: 'TOTAL',
      umbralAprobacionDescuentoBps: 2000,
    });

    const created = await createOrder(table1Id, [{ productoId: nachosId, cantidad: 2 }]);
    order1Id = created.orderId;
    nachosItem1Id = created.itemIds[0]!;

    const account = await getAccountByTable(table1Id);
    account1Id = account.id;

    expect(account).toMatchObject({
      estado: 'OPEN',
      subtotal: 48000,
      descuentos: 0,
      impuestos: 9120,
      propina: 0,
      total: 57120,
      pagado: 0,
      saldo: 57120,
      propinaBps: 0,
      propinaSugeridaBps: 1000,
      propinaHabilitada: true,
      preciosIncluyenImpuesto: false,
    });
    expect(account.lineas).toEqual([
      {
        itemId: nachosItem1Id,
        nombre: 'Nachos',
        cantidad: 2,
        precioUnitario: 24000,
        total: 48000,
        descuento: 0,
        neto: 48000,
      },
    ]);
    expect(account.impuestosDetalle).toEqual([
      expect.objectContaining({ nombre: 'IVA', tasaBps: 1900, monto: 9120 }),
    ]);
  });

  it('aplica descuento del 10 %, propina del 10 % y reproduce el ejemplo de la especificación', async () => {
    const discounted = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/descuentos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        alcance: 'ACCOUNT',
        tipo: 'PERCENT',
        valor: 1000,
        motivo: 'Cliente frecuente',
      })
      .expect(201);

    expect(discounted.body).toMatchObject({
      subtotal: 48000,
      descuentos: 4800,
      impuestos: 8208,
      propina: 0,
      total: 51408,
      saldo: 51408,
    });
    expect((discounted.body as AccountDetail).descuentosDetalle[0]).toMatchObject({
      alcance: 'ACCOUNT',
      tipo: 'PERCENT',
      valor: 1000,
      motivo: 'Cliente frecuente',
      aprobado: false,
    });

    const tipped = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/propina`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ porcentajeBps: 1000 })
      .expect(201);

    expect(tipped.body).toMatchObject({
      subtotal: 48000,
      descuentos: 4800,
      impuestos: 8208,
      propina: 5141,
      total: 56549,
      saldo: 56549,
      propinaBps: 1000,
    });
  });

  it('registra pagos parciales y mixtos y exige el saldo exacto para cerrar', async () => {
    const partial = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CASH', monto: 20000 })
      .expect(201);

    expect(partial.body).toMatchObject({ pagado: 20000, saldo: 36549 });
    expect((partial.body as AccountDetail).pagos[0]).toMatchObject({
      metodo: 'CASH',
      monto: 20000,
    });

    const table = await request(app.getHttpServer())
      .get(`/mesas/${table1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((table.body as { status: string }).status).toBe('TO_CHARGE');

    await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CARD', monto: 40000 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/cerrar`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(400);

    const rest = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'TRANSFER', monto: 36549, referencia: 'TRX-001' })
      .expect(201);

    expect(rest.body).toMatchObject({ pagado: 56549, saldo: 0 });

    const closed = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/cerrar`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(201);

    expect(closed.body).toMatchObject({ estado: 'CLOSED', total: 56549, pagado: 56549 });

    const tableAfterClose = await request(app.getHttpServer())
      .get(`/mesas/${table1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((tableAfterClose.body as { status: string }).status).toBe('FREE');

    const order = await request(app.getHttpServer())
      .get(`/pedidos/${order1Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((order.body as { status: string }).status).toBe('CLOSED');

    await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/cerrar`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(400);
  });

  it('anula una cuenta cerrada solo con administrador y guarda el motivo', async () => {
    await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/anular`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ motivo: 'Cobro duplicado' })
      .expect(403);

    const voided = await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/anular`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ motivo: 'Cobro duplicado' })
      .expect(201);

    expect(voided.body).toMatchObject({
      estado: 'VOIDED',
      motivoAnulacion: 'Cobro duplicado',
    });
    expect((voided.body as AccountDetail).pagos).toHaveLength(2);
  });

  it('aplica descuentos por ítem y respeta el umbral de aprobación', async () => {
    await createOrder(table3Id, [{ productoId: nachosId, cantidad: 1 }]);

    const account = await getAccountByTable(table3Id);
    account3Id = account.id;
    expect(account.total).toBe(28560);

    await request(app.getHttpServer())
      .post(`/cuentas/${account3Id}/descuentos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ alcance: 'ACCOUNT', tipo: 'PERCENT', valor: 2500, motivo: 'Ajuste alto' })
      .expect(403);

    const approved = await request(app.getHttpServer())
      .post(`/cuentas/${account3Id}/descuentos`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ alcance: 'ACCOUNT', tipo: 'PERCENT', valor: 2500, motivo: 'Ajuste alto' })
      .expect(201);

    expect(approved.body).toMatchObject({
      descuentos: 6000,
      impuestos: 3420,
      total: 21420,
    });
    expect((approved.body as AccountDetail).descuentosDetalle[0]).toMatchObject({
      aprobado: true,
      aprobadoPor: expect.objectContaining({ id: expect.any(String) }),
    });

    const itemOrder = await createOrder(table4Id, [{ productoId: nachosId, cantidad: 1 }]);
    const itemAccount = await getAccountByTable(table4Id);
    account4Id = itemAccount.id;

    await request(app.getHttpServer())
      .post(`/cuentas/${account4Id}/descuentos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ alcance: 'ITEM', tipo: 'PERCENT', valor: 1000, motivo: 'Cortesía' })
      .expect(400);

    const itemDiscount = await request(app.getHttpServer())
      .post(`/cuentas/${account4Id}/descuentos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        alcance: 'ITEM',
        tipo: 'PERCENT',
        valor: 1000,
        itemId: itemOrder.itemIds[0],
        motivo: 'Cortesía',
      })
      .expect(201);

    expect(itemDiscount.body).toMatchObject({
      subtotal: 24000,
      descuentos: 2400,
      impuestos: 4104,
      total: 25704,
    });
    expect((itemDiscount.body as AccountDetail).descuentosDetalle[0]).toMatchObject({
      itemId: itemOrder.itemIds[0],
      alcance: 'ITEM',
      tipo: 'PERCENT',
    });
  });

  it('divide por comensales o por ítems y reparte el total exacto', async () => {
    const created = await createOrder(table2Id, [{ productoId: beerId, cantidad: 3 }]);
    order2Id = created.orderId;
    beerItem2Id = created.itemIds[0]!;

    const account = await getAccountByTable(table2Id);
    account2Id = account.id;
    expect(account.total).toBe(42840);

    const tipped = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/propina`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ porcentajeBps: 1000 })
      .expect(201);
    expect(tipped.body).toMatchObject({ propina: 4284, total: 47124 });

    const noTip = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/propina`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ porcentajeBps: 0 })
      .expect(201);
    expect(noTip.body).toMatchObject({ propina: 0, total: 42840 });

    const diners = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/divisiones`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ tipo: 'COMENSAL', comensales: 3 })
      .expect(201);

    const dinerBody = diners.body as AccountDetail;
    expect(dinerBody.divisiones).toHaveLength(3);
    expect(dinerBody.divisiones.map((split) => split.monto)).toEqual([14280, 14280, 14280]);
    expect(dinerBody.divisiones.reduce((sum, split) => sum + split.monto, 0)).toBe(42840);

    await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/divisiones`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        tipo: 'ITEMS',
        grupos: [
          { etiqueta: 'Ana', items: [{ itemId: beerItem2Id, cantidad: 2 }] },
          { etiqueta: 'Beto', items: [{ itemId: beerItem2Id, cantidad: 2 }] },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/divisiones`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        tipo: 'ITEMS',
        grupos: [
          { etiqueta: 'Ana', items: [{ itemId: beerItem2Id, cantidad: 1 }] },
          { etiqueta: 'Beto', items: [{ itemId: beerItem2Id, cantidad: 1 }] },
        ],
      })
      .expect(400);

    const byItems = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/divisiones`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        tipo: 'ITEMS',
        grupos: [
          { etiqueta: 'Ana', items: [{ itemId: beerItem2Id, cantidad: 1 }] },
          { etiqueta: 'Beto', items: [{ itemId: beerItem2Id, cantidad: 2 }] },
        ],
      })
      .expect(201);

    const itemBody = byItems.body as AccountDetail;
    expect(itemBody.divisiones).toHaveLength(2);
    expect(itemBody.divisiones.map((split) => split.monto)).toEqual([14280, 28560]);
    expect(itemBody.divisiones[0]?.items[0]).toMatchObject({
      itemId: beerItem2Id,
      cantidad: 1,
      monto: 12000,
    });
    expect(itemBody.divisiones[1]?.items[0]).toMatchObject({
      itemId: beerItem2Id,
      cantidad: 2,
      monto: 24000,
    });

    const anaSplit = itemBody.divisiones[0]!;
    const betoSplit = itemBody.divisiones[1]!;

    await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CASH', monto: anaSplit.monto, divisionId: anaSplit.etiqueta })
      .expect(400);

    const paidAna = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CASH', monto: 14280, divisionId: anaSplit.id })
      .expect(201);

    expect(paidAna.body).toMatchObject({ pagado: 14280, saldo: 28560 });
    expect((paidAna.body as AccountDetail).pagos[0]).toMatchObject({
      metodo: 'CASH',
      monto: 14280,
      division: 'Ana',
    });

    await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CARD', monto: 14280, divisionId: anaSplit.id })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo: 'CARD', monto: betoSplit.monto, divisionId: betoSplit.id })
      .expect(201);

    const closed = await request(app.getHttpServer())
      .post(`/cuentas/${account2Id}/cerrar`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(201);
    expect(closed.body).toMatchObject({ estado: 'CLOSED', saldo: 0 });

    const order = await request(app.getHttpServer())
      .get(`/pedidos/${order2Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);
    expect((order.body as { status: string }).status).toBe('CLOSED');
  });

  it('aísla las cuentas por restaurante y respeta los roles', async () => {
    const created = await createOrder(table2Id, [{ productoId: beerId, cantidad: 1 }]);
    const account = await getAccountByTable(table2Id);

    await request(app.getHttpServer())
      .get(`/cuentas/${account.id}`)
      .set('Authorization', `Bearer ${cashierBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/cuentas?mesaId=${table2Id}`)
      .set('Authorization', `Bearer ${cashierBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/cuentas?mesaId=${table2Id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/cuentas/${account.id}`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);

    expect(cashierAId).toBeTruthy();
    expect(created.orderId).toBeTruthy();
  });

  it('administra la configuración de cuentas y los impuestos del restaurante', async () => {
    const defaults = await request(app.getHttpServer())
      .get('/restaurantes/me/configuracion-cuenta')
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(200);

    expect(defaults.body).toMatchObject({
      preciosIncluyenImpuesto: false,
      propinaHabilitada: true,
      propinaSugeridaBps: 1000,
      basePropina: 'TOTAL',
      umbralAprobacionDescuentoBps: 2000,
    });

    await request(app.getHttpServer())
      .patch('/restaurantes/me/configuracion-cuenta')
      .set('Authorization', `Bearer ${cashierBToken}`)
      .send({ propinaSugeridaBps: 1200 })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch('/restaurantes/me/configuracion-cuenta')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({
        preciosIncluyenImpuesto: true,
        propinaHabilitada: false,
        propinaSugeridaBps: 1200,
        basePropina: 'SUBTOTAL',
        umbralAprobacionDescuentoBps: 1500,
      })
      .expect(200);

    expect(updated.body).toEqual({
      preciosIncluyenImpuesto: true,
      propinaHabilitada: false,
      propinaSugeridaBps: 1200,
      basePropina: 'SUBTOTAL',
      umbralAprobacionDescuentoBps: 1500,
    });

    const iva = await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ nombre: 'IVA', tasaBps: 1900, orden: 1 })
      .expect(201);
    const ivaId = (iva.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ nombre: 'Consumo', tasaBps: 800, orden: 2 })
      .expect(409);

    await request(app.getHttpServer())
      .patch('/restaurantes/me/configuracion-cuenta')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ preciosIncluyenImpuesto: false })
      .expect(200);

    const consumo = await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ nombre: 'Consumo', tasaBps: 800, orden: 2 })
      .expect(201);

    const taxes = await request(app.getHttpServer())
      .get('/impuestos')
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(200);
    expect((taxes.body as { meta: { total: number } }).meta.total).toBe(2);

    const updatedTax = await request(app.getHttpServer())
      .patch(`/impuestos/${ivaId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ tasaBps: 1600 })
      .expect(200);
    expect(updatedTax.body).toMatchObject({ nombre: 'IVA', tasaBps: 1600 });

    await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ nombre: 'IVA', tasaBps: 1000 })
      .expect(409);

    await request(app.getHttpServer())
      .get(`/impuestos/${ivaId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/impuestos')
      .set('Authorization', `Bearer ${cashierBToken}`)
      .send({ nombre: 'Propina', tasaBps: 1000 })
      .expect(403);

    const deactivated = await request(app.getHttpServer())
      .delete(`/impuestos/${ivaId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(200);
    expect(deactivated.body).toMatchObject({ activo: false });

    expect((consumo.body as { id: string }).id).toBeTruthy();
  });
});
