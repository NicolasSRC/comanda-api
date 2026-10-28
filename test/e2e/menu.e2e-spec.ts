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
  email: 'e2e-menu-superadmin@comanda.test',
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
      fullName: 'Superadmin Menú E2E',
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

describe('Carta (e2e)', () => {
  const suffix = uniqueSuffix();
  const slugA = `menu-a-${suffix}`;
  const slugB = `menu-b-${suffix}`;
  const adminAEmail = `menu-admin-a-${suffix}@test.com`;
  const adminBEmail = `menu-admin-b-${suffix}@test.com`;
  const waiterAEmail = `menu-waiter-a-${suffix}@test.com`;

  let superadminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAToken: string;

  let categoryId: string;
  let productId: string;
  let variantId: string;
  let simpleProductId: string;
  let flanId: string;
  let groupId: string;
  let modifierId: string;
  let comboId: string;
  let versionId: string;

  beforeAll(async () => {
    superadminToken = await login(superadmin.email, superadmin.password);

    await createRestaurant(superadminToken, slugA, adminAEmail);
    await createRestaurant(superadminToken, slugB, adminBEmail);

    adminAToken = await login(adminAEmail, 'Admin123!');
    adminBToken = await login(adminBEmail, 'Admin123!');

    await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        email: waiterAEmail,
        password: 'Mesero123!',
        fullName: 'Mesero Menú A',
        role: Role.WAITER,
      })
      .expect(201);

    waiterAToken = await login(waiterAEmail, 'Mesero123!');
  });

  it('el administrador configura categorías, productos, variantes, modificadores y combos', async () => {
    const category = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Entradas', description: 'Para empezar', sortOrder: 1 })
      .expect(201);
    categoryId = (category.body as { id: string }).id;

    const product = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Nachos',
        description: 'Con queso y guacamole',
        basePrice: 18000,
        preparationArea: 'KITCHEN',
      })
      .expect(201);
    productId = (product.body as { id: string }).id;

    const variant = await request(app.getHttpServer())
      .post(`/productos/${productId}/variantes`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Personal', price: 18000, sortOrder: 1 })
      .expect(201);
    variantId = (variant.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/productos/${productId}/variantes`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Compartir', price: 32000, sortOrder: 2 })
      .expect(201);

    const group = await request(app.getHttpServer())
      .post('/grupos-modificadores')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Adiciones', minSelections: 0, maxSelections: 2 })
      .expect(201);
    groupId = (group.body as { id: string }).id;

    const modifier = await request(app.getHttpServer())
      .post(`/grupos-modificadores/${groupId}/modificadores`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Queso extra', extraPrice: 2000 })
      .expect(201);
    modifierId = (modifier.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/productos/${productId}/grupos-modificadores`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ groupId })
      .expect(201);

    const modifiers = await request(app.getHttpServer())
      .get(`/grupos-modificadores/${groupId}/modificadores`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    expect((modifiers.body as Array<{ id: string }>).map((item) => item.id)).toContain(modifierId);

    // Ventana de todo el día para que la disponibilidad no dependa de la hora.
    await request(app.getHttpServer())
      .post(`/productos/${productId}/disponibilidad`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ daysOfWeek: 127, startTime: '00:00', endTime: '00:00' })
      .expect(201);

    const simple = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        categoryId,
        name: 'Cerveza artesanal',
        basePrice: 12000,
        preparationArea: 'BAR',
      })
      .expect(201);
    simpleProductId = (simple.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/productos/${simpleProductId}/reglas-precio`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Happy hour',
        price: 9000,
        daysOfWeek: 127,
        startTime: '00:00',
        endTime: '00:00',
        priority: 10,
      })
      .expect(201);

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

    const combo = await request(app.getHttpServer())
      .post('/combos')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Combo almuerzo',
        price: 35000,
        items: [
          { productId, variantId, quantity: 1 },
          { productId: simpleProductId, quantity: 1 },
        ],
      })
      .expect(201);
    comboId = (combo.body as { id: string }).id;

    const comboDetail = await request(app.getHttpServer())
      .get(`/combos/${comboId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    expect((comboDetail.body as { items: unknown[] }).items).toHaveLength(2);

    const detail = await request(app.getHttpServer())
      .get(`/productos/${productId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect((detail.body as { variants: unknown[] }).variants).toHaveLength(2);
    expect((detail.body as { modifierGroups: unknown[] }).modifierGroups).toHaveLength(1);
  });

  it('aísla los recursos entre restaurantes y respeta los roles', async () => {
    await request(app.getHttpServer())
      .get(`/productos/${productId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/categorias/${categoryId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/productos')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${waiterAToken}`)
      .send({ name: 'Intruso' })
      .expect(403);
  });

  it('no publica la carta hasta que exista una versión publicada', async () => {
    await request(app.getHttpServer()).get(`/publico/${slugA}/carta`).expect(404);

    const draft = await request(app.getHttpServer())
      .post('/cartas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Carta A' })
      .expect(201);

    versionId = (draft.body as { id: string }).id;
    expect((draft.body as { status: string }).status).toBe('DRAFT');

    await request(app.getHttpServer()).get(`/publico/${slugA}/carta`).expect(404);
  });

  it('publica la carta y expone precios, variantes y modificadores', async () => {
    await request(app.getHttpServer())
      .post(`/cartas/${versionId}/publicar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    const response = await request(app.getHttpServer()).get(`/publico/${slugA}/carta`).expect(200);

    const body = response.body as {
      restaurante: { slug: string; moneda: string; zonaHoraria: string };
      version: { id: string; publicadaEn: string };
      categorias: Array<{
        nombre: string;
        productos: Array<{
          id: string;
          nombre: string;
          precio: number;
          disponible: boolean;
          area: string;
          variantes: Array<{ nombre: string; precio: number }>;
          gruposModificadores: Array<{
            nombre: string;
            modificadores: Array<{ nombre: string; precioExtra: number }>;
          }>;
        }>;
      }>;
      combos: Array<{ nombre: string; precio: number }>;
    };

    expect(body.restaurante).toMatchObject({
      slug: slugA,
      moneda: 'COP',
      zonaHoraria: 'America/Bogota',
    });
    expect(body.version.publicadaEn).toBeTruthy();
    expect(body.categorias).toHaveLength(1);

    const products = body.categorias[0]!.productos;
    const nachos = products.find((product) => product.nombre === 'Nachos');
    expect(nachos).toBeDefined();
    expect(nachos!.precio).toBe(18000);
    expect(nachos!.disponible).toBe(true);
    expect(nachos!.area).toBe('KITCHEN');
    expect(nachos!.variantes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nombre: 'Personal', precio: 18000 }),
        expect.objectContaining({ nombre: 'Compartir', precio: 32000 }),
      ]),
    );
    expect(nachos!.gruposModificadores[0]).toMatchObject({
      nombre: 'Adiciones',
      modificadores: [expect.objectContaining({ nombre: 'Queso extra', precioExtra: 2000 })],
    });

    // Regla de precio vigente sobre el precio base.
    const beer = products.find((product) => product.nombre === 'Cerveza artesanal');
    expect(beer!.precio).toBe(9000);

    expect(body.combos[0]).toMatchObject({ nombre: 'Combo almuerzo', precio: 35000 });
    expect(JSON.stringify(body)).not.toContain('restaurantId');
    expect(JSON.stringify(body)).not.toContain('isActive');
  });

  it('previsualiza borradores solo para el restaurante dueño', async () => {
    await request(app.getHttpServer()).get(`/cartas/${versionId}/previsualizar`).expect(401);

    await request(app.getHttpServer())
      .get(`/cartas/${versionId}/previsualizar`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    const preview = await request(app.getHttpServer())
      .get(`/cartas/${versionId}/previsualizar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect((preview.body as { version: { estado: string } }).version.estado).toBe('PUBLISHED');
  });

  it('mantiene congelado el snapshot aunque cambie la carta', async () => {
    await request(app.getHttpServer())
      .patch(`/productos/${flanId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ basePrice: 15000 })
      .expect(200);

    const response = await request(app.getHttpServer()).get(`/publico/${slugA}/carta`).expect(200);

    const products = (
      response.body as {
        categorias: Array<{ productos: Array<{ nombre: string; precio: number }> }>;
      }
    ).categorias[0]!.productos;
    const flan = products.find((product) => product.nombre === 'Flan');
    expect(flan!.precio).toBe(9000);
  });

  it('oculta los productos agotados al publicar una nueva versión', async () => {
    await request(app.getHttpServer())
      .patch(`/productos/${flanId}/disponibilidad`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ isAvailable: false })
      .expect(200);

    const draft = await request(app.getHttpServer())
      .post('/cartas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Carta A sin flan' })
      .expect(201);
    const newVersionId = (draft.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/cartas/${newVersionId}/publicar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    const publicMenu = await request(app.getHttpServer())
      .get(`/publico/${slugA}/carta`)
      .expect(200);
    const publicProducts = (
      publicMenu.body as {
        categorias: Array<{ productos: Array<{ nombre: string }> }>;
      }
    ).categorias.flatMap((category) => category.productos);
    expect(publicProducts.some((product) => product.nombre === 'Flan')).toBe(false);

    const preview = await request(app.getHttpServer())
      .get(`/cartas/${newVersionId}/previsualizar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    const previewProducts = (
      preview.body as {
        categorias: Array<{
          productos: Array<{ nombre: string; disponible: boolean }>;
        }>;
      }
    ).categorias.flatMap((category) => category.productos);
    expect(previewProducts.find((product) => product.nombre === 'Flan')).toMatchObject({
      disponible: false,
    });
  });

  it('lista, archiva y duplica versiones de carta', async () => {
    const versions = await request(app.getHttpServer())
      .get('/cartas')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    const body = versions.body as { data: Array<{ status: string }>; meta: { total: number } };
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
    expect(body.data.filter((version) => version.status === 'PUBLISHED')).toHaveLength(1);

    const duplicated = await request(app.getHttpServer())
      .post(`/cartas/${versionId}/duplicar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Carta clonada' })
      .expect(201);

    expect(duplicated.body).toMatchObject({ name: 'Carta clonada', status: 'DRAFT' });
  });

  it('no expone la carta de un restaurante sin versión publicada', async () => {
    await request(app.getHttpServer()).get(`/publico/${slugB}/carta`).expect(404);
  });
});
