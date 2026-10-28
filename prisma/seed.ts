/* eslint-disable no-console */
import {
  MenuVersionStatus,
  PreparationArea,
  Prisma,
  PrismaClient,
  Role,
  TipBase,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { buildMenuSnapshot } from '../src/modules/menu/menu-snapshot.builder';

// Permite ejecutar `tsx prisma/seed.ts` sin depender de dotenv.
try {
  process.loadEnvFile('.env');
} catch {
  // .env es opcional si las variables ya están en el entorno.
}

const prisma = new PrismaClient();
const passwordOptions: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

interface SeedVariant {
  name: string;
  price: number;
  sortOrder?: number;
}

interface SeedPriceRule {
  name: string;
  price: number;
  startTime: string;
  endTime: string;
  daysOfWeek?: number;
  priority?: number;
}

interface SeedProduct {
  name: string;
  category: string;
  description: string;
  basePrice: number;
  area: PreparationArea;
  variants?: SeedVariant[];
  groups?: string[];
  priceRules?: SeedPriceRule[];
}

async function upsertUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  restaurantId: string | null;
}): Promise<void> {
  const passwordHash = await argon2.hash(input.password, { ...passwordOptions, raw: false });

  await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      restaurantId: input.restaurantId,
      isActive: true,
    },
    create: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      restaurantId: input.restaurantId,
    },
  });
}

async function seedMenu(restaurantId: string): Promise<void> {
  const categories = [
    { name: 'Entradas', description: 'Para empezar', sortOrder: 1 },
    { name: 'Platos fuertes', description: 'Especialidades de la casa', sortOrder: 2 },
    { name: 'Postres', description: 'Dulce final', sortOrder: 3 },
    { name: 'Bebidas', description: 'Fríos y calientes', sortOrder: 4 },
  ];

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { restaurantId_name: { restaurantId, name: category.name } },
      update: { description: category.description, sortOrder: category.sortOrder, isActive: true },
      create: { restaurantId, ...category },
    });
    categoryIds.set(category.name, row.id);
  }

  const groups: Array<{
    name: string;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    sortOrder: number;
    modifiers: Array<{ name: string; extraPrice: number; sortOrder: number }>;
  }> = [
    {
      name: 'Adiciones',
      isRequired: false,
      minSelections: 0,
      maxSelections: 3,
      sortOrder: 1,
      modifiers: [
        { name: 'Queso extra', extraPrice: 2000, sortOrder: 1 },
        { name: 'Guacamole', extraPrice: 3000, sortOrder: 2 },
        { name: 'Jalapeños', extraPrice: 1000, sortOrder: 3 },
      ],
    },
    {
      name: 'Punto de cocción',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 2,
      modifiers: [
        { name: 'Término medio', extraPrice: 0, sortOrder: 1 },
        { name: 'Bien cocida', extraPrice: 0, sortOrder: 2 },
        { name: 'Poco hecha', extraPrice: 0, sortOrder: 3 },
      ],
    },
    {
      name: 'Salsas',
      isRequired: true,
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 3,
      modifiers: [
        { name: 'BBQ', extraPrice: 0, sortOrder: 1 },
        { name: 'Picante', extraPrice: 0, sortOrder: 2 },
        { name: 'Miel y mostaza', extraPrice: 0, sortOrder: 3 },
      ],
    },
  ];

  const groupIds = new Map<string, string>();
  for (const group of groups) {
    const row = await prisma.modifierGroup.upsert({
      where: { restaurantId_name: { restaurantId, name: group.name } },
      update: {
        isRequired: group.isRequired,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      create: {
        restaurantId,
        name: group.name,
        isRequired: group.isRequired,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        sortOrder: group.sortOrder,
      },
    });
    groupIds.set(group.name, row.id);

    for (const modifier of group.modifiers) {
      await prisma.modifier.upsert({
        where: { groupId_name: { groupId: row.id, name: modifier.name } },
        update: { extraPrice: modifier.extraPrice, sortOrder: modifier.sortOrder, isActive: true },
        create: {
          restaurantId,
          groupId: row.id,
          name: modifier.name,
          extraPrice: modifier.extraPrice,
          sortOrder: modifier.sortOrder,
        },
      });
    }
  }

  const products: SeedProduct[] = [
    {
      name: 'Nachos',
      category: 'Entradas',
      description: 'Totopos con queso cheddar y guacamole',
      basePrice: 18000,
      area: PreparationArea.KITCHEN,
      variants: [
        { name: 'Personal', price: 18000, sortOrder: 1 },
        { name: 'Compartir', price: 32000, sortOrder: 2 },
      ],
      groups: ['Adiciones'],
    },
    {
      name: 'Alitas BBQ',
      category: 'Entradas',
      description: 'Alitas bañadas en salsa BBQ',
      basePrice: 22000,
      area: PreparationArea.KITCHEN,
      groups: ['Salsas'],
    },
    {
      name: 'Hamburguesa Comanda',
      category: 'Platos fuertes',
      description: 'Carne de 180 g, queso, lechuga y tomate',
      basePrice: 28000,
      area: PreparationArea.KITCHEN,
      groups: ['Punto de cocción', 'Adiciones'],
    },
    {
      name: 'Limonada',
      category: 'Bebidas',
      description: 'Limonada natural',
      basePrice: 8000,
      area: PreparationArea.BAR,
      variants: [
        { name: 'Vaso', price: 8000, sortOrder: 1 },
        { name: 'Jarra', price: 18000, sortOrder: 2 },
      ],
    },
    {
      name: 'Cerveza artesanal',
      category: 'Bebidas',
      description: 'Cerveza local de la casa',
      basePrice: 12000,
      area: PreparationArea.BAR,
      priceRules: [
        {
          name: 'Happy hour',
          price: 9000,
          startTime: '17:00',
          endTime: '19:00',
          daysOfWeek: 127,
          priority: 10,
        },
      ],
    },
    {
      name: 'Flan',
      category: 'Postres',
      description: 'Flan de caramelo',
      basePrice: 9000,
      area: PreparationArea.KITCHEN,
    },
  ];

  const productIds = new Map<string, string>();
  const variantIds = new Map<string, string>();

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) {
      throw new Error(`Categoría no encontrada en el seed: ${product.category}`);
    }

    const row = await prisma.product.upsert({
      where: { restaurantId_name: { restaurantId, name: product.name } },
      update: {
        categoryId,
        description: product.description,
        basePrice: product.basePrice,
        preparationArea: product.area,
        isActive: true,
        isAvailable: true,
      },
      create: {
        restaurantId,
        categoryId,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        preparationArea: product.area,
      },
    });
    productIds.set(product.name, row.id);

    for (const variant of product.variants ?? []) {
      const variantRow = await prisma.variant.upsert({
        where: { productId_name: { productId: row.id, name: variant.name } },
        update: { price: variant.price, sortOrder: variant.sortOrder ?? 0, isActive: true },
        create: {
          restaurantId,
          productId: row.id,
          name: variant.name,
          price: variant.price,
          sortOrder: variant.sortOrder ?? 0,
        },
      });
      variantIds.set(`${product.name}:${variant.name}`, variantRow.id);
    }

    for (const [index, groupName] of (product.groups ?? []).entries()) {
      const groupId = groupIds.get(groupName);
      if (!groupId) {
        throw new Error(`Grupo no encontrado en el seed: ${groupName}`);
      }
      await prisma.productModifierGroup.upsert({
        where: { productId_groupId: { productId: row.id, groupId } },
        update: { sortOrder: index + 1 },
        create: { productId: row.id, groupId, sortOrder: index + 1 },
      });
    }

    for (const rule of product.priceRules ?? []) {
      await prisma.priceRule.upsert({
        where: { productId_name: { productId: row.id, name: rule.name } },
        update: {
          price: rule.price,
          startTime: rule.startTime,
          endTime: rule.endTime,
          daysOfWeek: rule.daysOfWeek ?? 127,
          priority: rule.priority ?? 0,
          isActive: true,
        },
        create: {
          restaurantId,
          productId: row.id,
          name: rule.name,
          price: rule.price,
          startTime: rule.startTime,
          endTime: rule.endTime,
          daysOfWeek: rule.daysOfWeek ?? 127,
          priority: rule.priority ?? 0,
        },
      });
    }
  }

  const combos = [
    {
      name: 'Combo almuerzo',
      description: 'Hamburguesa Comanda + limonada',
      price: 35000,
      items: [
        { productName: 'Hamburguesa Comanda', quantity: 1, variantName: null },
        { productName: 'Limonada', quantity: 1, variantName: 'Vaso' },
      ],
    },
  ];

  for (const combo of combos) {
    const row = await prisma.combo.upsert({
      where: { restaurantId_name: { restaurantId, name: combo.name } },
      update: { description: combo.description, price: combo.price, isActive: true },
      create: {
        restaurantId,
        name: combo.name,
        description: combo.description,
        price: combo.price,
      },
    });

    await prisma.comboItem.deleteMany({ where: { comboId: row.id } });
    await prisma.comboItem.createMany({
      data: combo.items.map((item) => {
        const productId = productIds.get(item.productName);
        if (!productId) {
          throw new Error(`Producto no encontrado para el combo: ${item.productName}`);
        }
        const variantId = item.variantName
          ? variantIds.get(`${item.productName}:${item.variantName}`)
          : null;
        if (item.variantName && !variantId) {
          throw new Error(
            `Variante no encontrada para el combo: ${item.productName} / ${item.variantName}`,
          );
        }

        return {
          restaurantId,
          comboId: row.id,
          productId,
          variantId,
          quantity: item.quantity,
        };
      }),
    });
  }

  // Publica una carta demo con la configuración anterior. Al reejecutar el
  // seed se actualiza el snapshot y se conserva el mismo identificador.
  const snapshot = await buildMenuSnapshot(prisma, restaurantId);
  const versionName = 'Carta demo';
  const existing = await prisma.menuVersion.findFirst({
    where: { restaurantId, name: versionName },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.menuVersion.updateMany({
      where: {
        restaurantId,
        status: MenuVersionStatus.PUBLISHED,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      data: { status: MenuVersionStatus.ARCHIVED },
    });

    if (existing) {
      await tx.menuVersion.update({
        where: { id: existing.id },
        data: {
          status: MenuVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.menuVersion.create({
        data: {
          restaurantId,
          name: versionName,
          status: MenuVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    }
  });
}

async function seedZonesAndTables(restaurantId: string): Promise<void> {
  const zones = [
    {
      name: 'Salón principal',
      sortOrder: 1,
      tables: [
        { name: 'Mesa 1', capacity: 4 },
        { name: 'Mesa 2', capacity: 4 },
        { name: 'Mesa 3', capacity: 2 },
      ],
    },
    {
      name: 'Terraza',
      sortOrder: 2,
      tables: [
        { name: 'Mesa 4', capacity: 6 },
        { name: 'Mesa 5', capacity: 2 },
      ],
    },
  ];

  for (const zone of zones) {
    const row = await prisma.zone.upsert({
      where: { restaurantId_name: { restaurantId, name: zone.name } },
      update: { sortOrder: zone.sortOrder, isActive: true },
      create: { restaurantId, name: zone.name, sortOrder: zone.sortOrder },
    });

    for (const table of zone.tables) {
      await prisma.restaurantTable.upsert({
        where: { restaurantId_name: { restaurantId, name: table.name } },
        update: { zoneId: row.id, capacity: table.capacity },
        create: {
          restaurantId,
          zoneId: row.id,
          name: table.name,
          capacity: table.capacity,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const superadminEmail = (
    process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@comanda.app'
  ).toLowerCase();
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? 'Superadmin123!';

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Restaurante Demo',
      isActive: true,
      pricesIncludeTax: false,
      tipEnabled: true,
      tipSuggestedBps: 1000,
      tipBase: TipBase.TOTAL,
      discountApprovalThresholdBps: 2000,
    },
    create: {
      name: 'Restaurante Demo',
      slug: 'demo',
      currency: 'COP',
      timezone: 'America/Bogota',
      pricesIncludeTax: false,
      tipEnabled: true,
      tipSuggestedBps: 1000,
      tipBase: TipBase.TOTAL,
      discountApprovalThresholdBps: 2000,
    },
  });

  await prisma.tax.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'IVA' } },
    update: { rateBps: 1900, isActive: true, sortOrder: 1 },
    create: {
      restaurantId: restaurant.id,
      name: 'IVA',
      rateBps: 1900,
      isActive: true,
      sortOrder: 1,
    },
  });

  await upsertUser({
    email: superadminEmail,
    password: superadminPassword,
    fullName: 'Superadmin Comanda',
    role: Role.SUPERADMIN,
    restaurantId: null,
  });

  await upsertUser({
    email: adminEmail,
    password: adminPassword,
    fullName: 'Administrador Demo',
    role: Role.ADMIN,
    restaurantId: restaurant.id,
  });

  const staff: Array<{ email: string; password: string; fullName: string; role: Role }> = [
    {
      email: 'mesero@demo.com',
      password: 'Mesero123!',
      fullName: 'Mesero Demo',
      role: Role.WAITER,
    },
    {
      email: 'cocina@demo.com',
      password: 'Cocina123!',
      fullName: 'Cocina Demo',
      role: Role.KITCHEN,
    },
    {
      email: 'cajero@demo.com',
      password: 'Cajero123!',
      fullName: 'Cajero Demo',
      role: Role.CASHIER,
    },
  ];

  for (const person of staff) {
    await upsertUser({ ...person, restaurantId: restaurant.id });
  }

  await seedMenu(restaurant.id);
  await seedZonesAndTables(restaurant.id);

  console.log('\nSeed completado. Credenciales de desarrollo:\n');
  console.log(`  Superadmin : ${superadminEmail} / ${superadminPassword}`);
  console.log(`  Admin      : ${adminEmail} / ${adminPassword}`);
  console.log('  Mesero     : mesero@demo.com / Mesero123!');
  console.log('  Cocina     : cocina@demo.com / Cocina123!');
  console.log('  Cajero     : cajero@demo.com / Cajero123!');
  console.log(`\n  Restaurante demo: slug "demo" (${restaurant.id})`);
  console.log('  Carta demo publicada en GET /publico/demo/carta');
  console.log('  Mesas demo: 5 mesas en 2 zonas');
  console.log('  Cuentas demo: IVA 19 %, propina sugerida 10 %, umbral de descuento 20 %\n');
}

main()
  .catch((error: unknown) => {
    console.error('Error ejecutando el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
