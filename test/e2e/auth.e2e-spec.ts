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
  email: 'e2e-superadmin@comanda.test',
  password: 'Superadmin123!',
};

interface Session {
  accessToken: string;
  refreshToken: string;
}

async function login(email: string, password: string): Promise<Session> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body as Session;
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
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

  // Limpieza total: solo se ejecuta contra una base *_test.
  await cleanDatabase(prisma);

  const passwordHash = await argon2.hash(superadmin.password, {
    type: argon2.argon2id,
  });

  await prisma.user.create({
    data: {
      email: superadmin.email,
      passwordHash,
      fullName: 'Superadmin E2E',
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

describe('Autenticación (e2e)', () => {
  it('expone /health sin autenticación', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('rechaza credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superadmin.email, password: 'Incorrecta123!' })
      .expect(401);
  });

  it('inicia sesión y devuelve el perfil en /auth/me', async () => {
    const session = await login(superadmin.email, superadmin.password);

    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      email: superadmin.email,
      role: Role.SUPERADMIN,
      restaurantId: null,
    });
  });

  it('rota el refresh token y detecta su reutilización', async () => {
    const session = await login(superadmin.email, superadmin.password);

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    expect(rotated.body.refreshToken).not.toBe(session.refreshToken);

    // Reutilizar el token anterior revoca toda la familia de tokens.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('revoca el refresh token al cerrar sesión', async () => {
    const session = await login(superadmin.email, superadmin.password);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('permite restablecer la contraseña con el token de desarrollo', async () => {
    const session = await login(superadmin.email, superadmin.password);

    const forgot = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: superadmin.email })
      .expect(200);

    expect(forgot.body.resetToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: forgot.body.resetToken, newPassword: 'NuevaClave123!' })
      .expect(200);

    // Los refresh tokens previos quedan revocados.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);

    await login(superadmin.email, 'NuevaClave123!');

    // Restaura la contraseña original para el resto de pruebas.
    const restored = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: superadmin.email })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: restored.body.resetToken, newPassword: superadmin.password })
      .expect(200);
  });
});

describe('Multi-restaurante y roles (e2e)', () => {
  const suffix = uniqueSuffix();
  const slugA = `resto-a-${suffix}`;
  const slugB = `resto-b-${suffix}`;
  const adminAEmail = `admin-a-${suffix}@test.com`;
  const adminBEmail = `admin-b-${suffix}@test.com`;
  const waiterAEmail = `mesero-a-${suffix}@test.com`;

  let superadminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let waiterAId: string;

  beforeAll(async () => {
    superadminToken = (await login(superadmin.email, superadmin.password)).accessToken;

    await createRestaurant(superadminToken, slugA, adminAEmail);
    await createRestaurant(superadminToken, slugB, adminBEmail);

    adminAToken = (await login(adminAEmail, 'Admin123!')).accessToken;
    adminBToken = (await login(adminBEmail, 'Admin123!')).accessToken;

    const waiter = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        email: waiterAEmail,
        password: 'Mesero123!',
        fullName: 'Mesero A',
        role: Role.WAITER,
      })
      .expect(201);

    waiterAId = waiter.body.id;
  });

  it('el superadmin crea restaurantes con su primer administrador', async () => {
    const mine = await request(app.getHttpServer())
      .get('/restaurantes/me')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    expect(mine.body.slug).toBe(slugA);
  });

  it('el administrador no puede acceder a usuarios de otro restaurante', async () => {
    await request(app.getHttpServer())
      .get(`/usuarios/${waiterAId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/usuarios/${waiterAId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ fullName: 'Intruso' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/usuarios/${waiterAId}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(404);
  });

  it('el listado de usuarios solo incluye el restaurante del administrador', async () => {
    const response = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${adminBToken}`)
      .expect(200);

    const emails = (response.body.data as Array<{ email: string }>).map((user) => user.email);

    expect(emails).toContain(adminBEmail);
    expect(emails).not.toContain(waiterAEmail);
  });

  it('un mesero no puede gestionar usuarios', async () => {
    const waiterToken = (await login(waiterAEmail, 'Mesero123!')).accessToken;

    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${waiterToken}`)
      .expect(403);
  });

  it('el superadmin no puede crear usuarios de un restaurante', async () => {
    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(403);
  });

  it('desactivar un usuario impide su inicio de sesión', async () => {
    await request(app.getHttpServer())
      .delete(`/usuarios/${waiterAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: waiterAEmail, password: 'Mesero123!' })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/usuarios/${waiterAId}/reactivar`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);

    await login(waiterAEmail, 'Mesero123!');
  });
});
