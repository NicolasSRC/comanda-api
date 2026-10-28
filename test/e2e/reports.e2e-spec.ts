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
  email: 'e2e-reports-superadmin@comanda.test',
  password: 'Superadmin123!',
};

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
}

interface SalesReport {
  desde: string;
  hasta: string;
  agrupacion: string;
  periodos: Array<{
    periodo: string;
    pedidos: number;
    comensales: number;
    subtotal: number;
    descuentos: number;
    impuestos: number;
    propina: number;
    total: number;
    ticketPromedio: number;
  }>;
  totales: {
    pedidos: number;
    comensales: number;
    subtotal: number;
    descuentos: number;
    impuestos: number;
    propina: number;
    total: number;
    ticketPromedio: number;
  };
}

interface ProductsReport {
  productos: Array<{
    productoId: string;
    producto: string;
    categoriaId: string;
    categoria: string;
    cantidad: number;
    ventas: number;
  }>;
  masVendidos: ProductsReport['productos'];
  menosVendidos: ProductsReport['productos'];
  porCategoria: Array<{
    categoriaId: string;
    categoria: string;
    cantidad: number;
    ventas: number;
  }>;
}

interface CashReport {
  porMetodo: Array<{ metodo: string; pagos: number; total: number }>;
  porDia: Array<{
    fecha: string;
    metodos: Array<{ metodo: string; pagos: number; total: number }>;
    total: number;
  }>;
  totales: { pagos: number; total: number };
}

interface PreparationReport {
  areas: Array<{
    area: string;
    items: number;
    promedioSegundos: number;
    promedioMinutos: number;
  }>;
  total: { items: number; promedioSegundos: number; promedioMinutos: number };
}

interface AuditList {
  data: Array<{
    id: string;
    accion: string;
    entidad: string;
    entidadId: string;
    usuario: { id: string; nombre: string } | null;
    antes: Record<string, unknown> | null;
    despues: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    creadoEn: string;
  }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

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
      fullName: 'Superadmin Reportes E2E',
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

describe('Reportes y auditoría (e2e)', () => {
  const suffix = uniqueSuffix();
  const slugA = `reports-a-${suffix}`;
  const slugB = `reports-b-${suffix}`;
  const adminAEmail = `reports-admin-a-${suffix}@test.com`;
  const adminBEmail = `reports-admin-b-${suffix}@test.com`;
  const waiterAEmail = `reports-waiter-a-${suffix}@test.com`;
  const cashierAEmail = `reports-cashier-a-${suffix}@test.com`;

  let superadminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAToken: string;
  let cashierAToken: string;
  let cashierAId: string;

  let foodCategoryId: string;
  let drinksCategoryId: string;
  let nachosId: string;
  let beerId: string;
  let zoneId: string;
  let table1Id: string;
  let table2Id: string;
  let table3Id: string;
  let table4Id: string;

  let account1Id: string;
  let account3Id: string;

  let nachosItem1Id: string;
  let nachosItem2Id: string;
  let beerItem2Id: string;
  let beerItem4Id: string;

  beforeAll(async () => {
    superadminToken = await login(superadmin.email, superadmin.password);

    await createRestaurant(superadminToken, slugA, adminAEmail);
    await createRestaurant(superadminToken, slugB, adminBEmail);

    adminAToken = await login(adminAEmail, 'Admin123!');
    adminBToken = await login(adminBEmail, 'Admin123!');

    await createUser(adminAToken, waiterAEmail, Role.WAITER);
    cashierAId = (await createUser(adminAToken, cashierAEmail, Role.CASHIER)).id;

    waiterAToken = await login(waiterAEmail, 'Staff123!');
    cashierAToken = await login(cashierAEmail, 'Staff123!');

    const food = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Comida', sortOrder: 1 })
      .expect(201);
    foodCategoryId = (food.body as { id: string }).id;

    const drinks = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Bebidas', sortOrder: 2 })
      .expect(201);
    drinksCategoryId = (drinks.body as { id: string }).id;

    const nachos = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId: foodCategoryId,
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
        categoryId: drinksCategoryId,
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

    // Cuenta 1: 2 nachos, descuento del 10 % y pago mixto.
    const order1 = await createOrder(table1Id, [{ productoId: nachosId, cantidad: 2 }]);
    nachosItem1Id = order1.itemIds[0]!;
    const account1 = await getAccountByTable(table1Id);
    account1Id = account1.id;

    await request(app.getHttpServer())
      .post(`/cuentas/${account1Id}/descuentos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({
        alcance: 'ACCOUNT',
        tipo: 'PERCENT',
        valor: 1000,
        motivo: 'Cliente frecuente',
      })
      .expect(201);

    await pay(account1Id, 'CASH', 20000);
    await pay(account1Id, 'CARD', 23200);
    await close(account1Id);

    // Cuenta 2: 1 cerveza + 1 nachos pagados por transferencia.
    const order2 = await createOrder(table2Id, [
      { productoId: beerId, cantidad: 1 },
      { productoId: nachosId, cantidad: 1 },
    ]);
    beerItem2Id = order2.itemIds[0]!;
    nachosItem2Id = order2.itemIds[1]!;
    const account2 = await getAccountByTable(table2Id);

    await pay(account2.id, 'TRANSFER', 36000);
    await close(account2.id);

    // Cuenta 3: se cierra y luego se anula; no debe aparecer en reportes.
    await createOrder(table3Id, [{ productoId: nachosId, cantidad: 1 }]);
    const account3 = await getAccountByTable(table3Id);
    account3Id = account3.id;

    await pay(account3Id, 'CASH', 24000);
    await close(account3Id);

    await request(app.getHttpServer())
      .post(`/cuentas/${account3Id}/anular`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ motivo: 'Cobro duplicado' })
      .expect(201);

    // Cuenta 4: ítem cancelado para auditar la cancelación.
    const order4 = await createOrder(table4Id, [{ productoId: beerId, cantidad: 1 }]);
    beerItem4Id = order4.itemIds[0]!;

    await request(app.getHttpServer())
      .post(`/pedidos/${order4.orderId}/items/${beerItem4Id}/cancelar`)
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ motivo: 'El cliente cambió de opinión' })
      .expect(201);

    // Tiempos de preparación deterministas para el reporte (RF-64).
    const readyAt = new Date(Date.now() - 60_000);
    await prisma.orderItem.update({
      where: { id: nachosItem1Id },
      data: {
        startedAt: new Date(readyAt.getTime() - 300_000),
        readyAt,
      },
    });
    await prisma.orderItem.update({
      where: { id: nachosItem2Id },
      data: {
        startedAt: new Date(readyAt.getTime() - 420_000),
        readyAt,
      },
    });
    await prisma.orderItem.update({
      where: { id: beerItem2Id },
      data: {
        startedAt: new Date(readyAt.getTime() - 120_000),
        readyAt,
      },
    });

    // Cambios de precio auditables (RF-70).
    await request(app.getHttpServer())
      .patch(`/productos/${beerId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ basePrice: 13000 })
      .expect(200);

    const variant = await request(app.getHttpServer())
      .post(`/productos/${nachosId}/variantes`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Grande', price: 30000 })
      .expect(201);
    const variantId = (variant.body as { id: string }).id;

    await request(app.getHttpServer())
      .patch(`/productos/${nachosId}/variantes/${variantId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ price: 32000 })
      .expect(200);

    const rule = await request(app.getHttpServer())
      .post(`/productos/${nachosId}/reglas-precio`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Happy hour',
        price: 20000,
        startTime: '17:00',
        endTime: '19:00',
      })
      .expect(201);
    const ruleId = (rule.body as { id: string }).id;

    await request(app.getHttpServer())
      .patch(`/productos/${nachosId}/reglas-precio/${ruleId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ price: 21000 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/productos/${nachosId}/reglas-precio/${ruleId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    const combo = await request(app.getHttpServer())
      .post('/combos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Combo nachos',
        price: 30000,
        items: [{ productId: nachosId }],
      })
      .expect(201);
    const comboId = (combo.body as { id: string }).id;

    await request(app.getHttpServer())
      .patch(`/combos/${comboId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ price: 32000 })
      .expect(200);
  });

  async function createOrder(
    tableId: string,
    items: Array<{ productoId: string; cantidad: number }>,
  ): Promise<{ orderId: string; itemIds: string[] }> {
    const response = await request(app.getHttpServer())
      .post('/pedidos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ mesaId: tableId, comensales: 2, items })
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

  async function pay(accountId: string, metodo: string, monto: number): Promise<void> {
    await request(app.getHttpServer())
      .post(`/cuentas/${accountId}/pagos`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .send({ metodo, monto })
      .expect(201);
  }

  async function close(accountId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/cuentas/${accountId}/cerrar`)
      .set('Authorization', `Bearer ${cashierAToken}`)
      .expect(201);
  }

  describe('ventas', () => {
    it('cuadra las ventas con las cuentas cerradas y excluye las anuladas', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/ventas')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const report = response.body as SalesReport;

      expect(report.agrupacion).toBe('DIA');
      expect(report.periodos).toHaveLength(1);
      expect(report.periodos[0]).toMatchObject({
        pedidos: 2,
        comensales: 4,
        subtotal: 84000,
        descuentos: 4800,
        impuestos: 0,
        propina: 0,
        total: 79200,
        ticketPromedio: 39600,
      });
      expect(report.totales).toEqual({
        pedidos: 2,
        comensales: 4,
        subtotal: 84000,
        descuentos: 4800,
        impuestos: 0,
        propina: 0,
        total: 79200,
        ticketPromedio: 39600,
      });
    });

    it('agrupa por semana y mes', async () => {
      const weekly = await request(app.getHttpServer())
        .get('/reportes/ventas?agrupacion=SEMANA')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((weekly.body as SalesReport).periodos).toHaveLength(1);
      expect((weekly.body as SalesReport).periodos[0]!.periodo).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const monthly = await request(app.getHttpServer())
        .get('/reportes/ventas?agrupacion=MES')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((monthly.body as SalesReport).periodos[0]!.periodo).toMatch(/^\d{4}-\d{2}$/);
    });

    it('filtra por rango de fechas y valida el rango', async () => {
      const empty = await request(app.getHttpServer())
        .get('/reportes/ventas?desde=2099-01-01&hasta=2099-12-31')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect((empty.body as SalesReport).totales.pedidos).toBe(0);
      expect((empty.body as SalesReport).periodos).toEqual([]);

      await request(app.getHttpServer())
        .get('/reportes/ventas?desde=2026-10-31&hasta=2026-10-01')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(400);
    });

    it('exporta el CSV de ventas con BOM y fila de totales', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/ventas.csv')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      const csv = (response.text ?? response.body.toString()) as string;
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain(
        'periodo,pedidos,comensales,subtotal,descuentos,impuestos,propina,total,ticketPromedio',
      );
      expect(csv).toContain('TOTAL,2,4,84000,4800,0,0,79200,39600');
    });

    it('aísla los reportes por restaurante', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/ventas')
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200);

      expect((response.body as SalesReport).totales.pedidos).toBe(0);
      expect((response.body as SalesReport).periodos).toEqual([]);
    });

    it('restringe los reportes por rol', async () => {
      await request(app.getHttpServer())
        .get('/reportes/ventas')
        .set('Authorization', `Bearer ${waiterAToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/reportes/ventas')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .expect(403);
    });
  });

  describe('productos y meseros', () => {
    it('calcula más/menos vendidos y ventas por categoría', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/productos')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const report = response.body as ProductsReport;

      expect(report.productos).toEqual([
        {
          productoId: nachosId,
          producto: 'Nachos',
          categoriaId: foodCategoryId,
          categoria: 'Comida',
          cantidad: 3,
          ventas: 72000,
        },
        {
          productoId: beerId,
          producto: 'Cerveza artesanal',
          categoriaId: drinksCategoryId,
          categoria: 'Bebidas',
          cantidad: 1,
          ventas: 12000,
        },
      ]);
      expect(report.masVendidos[0]!.producto).toBe('Nachos');
      expect(report.menosVendidos[0]!.producto).toBe('Cerveza artesanal');
      expect(report.porCategoria).toEqual([
        {
          categoriaId: foodCategoryId,
          categoria: 'Comida',
          cantidad: 3,
          ventas: 72000,
        },
        {
          categoriaId: drinksCategoryId,
          categoria: 'Bebidas',
          cantidad: 1,
          ventas: 12000,
        },
      ]);
    });

    it('filtra por categoría, limita y ordena', async () => {
      const filtered = await request(app.getHttpServer())
        .get(`/reportes/productos?categoriaId=${drinksCategoryId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect((filtered.body as ProductsReport).productos).toHaveLength(1);
      expect((filtered.body as ProductsReport).productos[0]!.producto).toBe('Cerveza artesanal');

      const limited = await request(app.getHttpServer())
        .get('/reportes/productos?limite=1')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((limited.body as ProductsReport).productos).toHaveLength(1);

      const ascending = await request(app.getHttpServer())
        .get('/reportes/productos?orden=ASC')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((ascending.body as ProductsReport).productos[0]!.producto).toBe('Cerveza artesanal');
    });

    it('agrupa las ventas por mesero', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/meseros')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = response.body as {
        meseros: Array<{
          mesero: string;
          pedidos: number;
          comensales: number;
          total: number;
          ticketPromedio: number;
        }>;
        totales: { pedidos: number; comensales: number; total: number; ticketPromedio: number };
      };

      expect(body.meseros).toHaveLength(1);
      expect(body.meseros[0]).toMatchObject({
        mesero: 'Usuario WAITER',
        pedidos: 2,
        comensales: 4,
        total: 79200,
        ticketPromedio: 39600,
      });
      expect(body.totales).toEqual({
        pedidos: 2,
        comensales: 4,
        total: 79200,
        ticketPromedio: 39600,
      });
    });
  });

  describe('caja', () => {
    it('cierra la caja por método de pago y excluye cuentas anuladas', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/caja')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .expect(200);

      const report = response.body as CashReport;

      expect(report.porMetodo).toEqual([
        { metodo: 'CASH', pagos: 1, total: 20000 },
        { metodo: 'CARD', pagos: 1, total: 23200 },
        { metodo: 'TRANSFER', pagos: 1, total: 36000 },
      ]);
      expect(report.totales).toEqual({ pagos: 3, total: 79200 });
      expect(report.porDia).toHaveLength(1);
      expect(report.porDia[0]!.total).toBe(79200);
    });

    it('filtra por método de pago', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/caja?metodoPago=CASH')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .expect(200);

      const report = response.body as CashReport;
      expect(report.porMetodo).toEqual([{ metodo: 'CASH', pagos: 1, total: 20000 }]);
      expect(report.totales).toEqual({ pagos: 1, total: 20000 });
    });
  });

  describe('tiempos de preparación', () => {
    it('calcula el promedio por área', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/tiempos-preparacion')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const report = response.body as PreparationReport;

      expect(report.areas).toEqual([
        { area: 'BAR', items: 1, promedioSegundos: 120, promedioMinutos: 2 },
        { area: 'KITCHEN', items: 2, promedioSegundos: 360, promedioMinutos: 6 },
      ]);
      expect(report.total).toEqual({
        items: 3,
        promedioSegundos: 280,
        promedioMinutos: 5,
      });
    });

    it('filtra por área', async () => {
      const response = await request(app.getHttpServer())
        .get('/reportes/tiempos-preparacion?area=KITCHEN')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const report = response.body as PreparationReport;
      expect(report.areas).toHaveLength(1);
      expect(report.areas[0]!.area).toBe('KITCHEN');
    });
  });

  describe('auditoría', () => {
    it('registra todas las acciones sensibles con usuario y valores', async () => {
      const response = await request(app.getHttpServer())
        .get('/auditoria?limit=100')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const list = response.body as AuditList;
      expect(list.meta.total).toBe(9);

      const actions = list.data.map((entry) => entry.accion).sort();
      expect(actions).toEqual([
        'APPLY_DISCOUNT',
        'CANCEL_ITEM',
        'CREATE_PRICE_RULE',
        'DEACTIVATE_PRICE_RULE',
        'UPDATE_COMBO_PRICE',
        'UPDATE_PRICE_RULE',
        'UPDATE_PRODUCT_PRICE',
        'UPDATE_VARIANT_PRICE',
        'VOID_ACCOUNT',
      ]);

      const discount = list.data.find((entry) => entry.accion === 'APPLY_DISCOUNT')!;
      expect(discount.entidad).toBe('Discount');
      expect(discount.usuario).toEqual({ id: cashierAId, nombre: 'Usuario CASHIER' });
      expect(discount.antes).toBeNull();
      expect(discount.despues).toMatchObject({
        cuentaId: account1Id,
        alcance: 'ACCOUNT',
        tipo: 'PERCENT',
        valor: 1000,
        motivo: 'Cliente frecuente',
        base: 48000,
        descuentoBps: 1000,
      });

      const voided = list.data.find((entry) => entry.accion === 'VOID_ACCOUNT')!;
      expect(voided.entidad).toBe('Account');
      expect(voided.entidadId).toBe(account3Id);
      expect(voided.antes).toMatchObject({ estado: 'CLOSED', total: 24000, pagado: 24000 });
      expect(voided.despues).toMatchObject({ estado: 'VOIDED', motivo: 'Cobro duplicado' });

      const cancelled = list.data.find((entry) => entry.accion === 'CANCEL_ITEM')!;
      expect(cancelled.entidad).toBe('OrderItem');
      expect(cancelled.entidadId).toBe(beerItem4Id);
      expect(cancelled.antes).toMatchObject({
        estado: 'PENDING',
        cantidad: 1,
        producto: 'Cerveza artesanal',
        total: 12000,
      });
      expect(cancelled.despues).toMatchObject({
        estado: 'CANCELLED',
        motivo: 'El cliente cambió de opinión',
      });

      const priceChange = list.data.find((entry) => entry.accion === 'UPDATE_PRODUCT_PRICE')!;
      expect(priceChange.entidadId).toBe(beerId);
      expect(priceChange.antes).toEqual({ precioBase: 12000 });
      expect(priceChange.despues).toEqual({ precioBase: 13000 });
    });

    it('filtra por acción, entidad, entidadId y usuario', async () => {
      const byAction = await request(app.getHttpServer())
        .get('/auditoria?accion=APPLY_DISCOUNT')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((byAction.body as AuditList).meta.total).toBe(1);

      const byEntity = await request(app.getHttpServer())
        .get('/auditoria?entidad=Account')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((byEntity.body as AuditList).meta.total).toBe(1);
      expect((byEntity.body as AuditList).data[0]!.accion).toBe('VOID_ACCOUNT');

      const byEntityId = await request(app.getHttpServer())
        .get(`/auditoria?entidadId=${account3Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((byEntityId.body as AuditList).meta.total).toBe(1);

      const byUser = await request(app.getHttpServer())
        .get(`/auditoria?usuarioId=${cashierAId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((byUser.body as AuditList).meta.total).toBe(1);
      expect((byUser.body as AuditList).data[0]!.accion).toBe('APPLY_DISCOUNT');
    });

    it('pagina los resultados y filtra por rango de fechas', async () => {
      const page = await request(app.getHttpServer())
        .get('/auditoria?page=1&limit=3')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = page.body as AuditList;
      expect(body.data).toHaveLength(3);
      expect(body.meta).toEqual({ page: 1, limit: 3, total: 9, totalPages: 3 });

      const empty = await request(app.getHttpServer())
        .get('/auditoria?desde=2099-01-01&hasta=2099-12-31')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
      expect((empty.body as AuditList).meta.total).toBe(0);
    });

    it('aísla la auditoría por restaurante y restringe por rol', async () => {
      const otherTenant = await request(app.getHttpServer())
        .get('/auditoria')
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200);
      expect((otherTenant.body as AuditList).meta.total).toBe(0);

      await request(app.getHttpServer())
        .get('/auditoria')
        .set('Authorization', `Bearer ${waiterAToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/auditoria')
        .set('Authorization', `Bearer ${cashierAToken}`)
        .expect(403);
    });
  });
});
