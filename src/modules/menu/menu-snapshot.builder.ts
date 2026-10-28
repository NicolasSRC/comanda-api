import type { PrismaClient } from '@prisma/client';
import type { MenuSnapshot } from './menu-snapshot.types';

/**
 * Construye la foto JSON de la carta. Es una función pura sobre Prisma para
 * poder reutilizarla desde el seed sin levantar el contenedor de Nest.
 */
export async function buildMenuSnapshot(
  prisma: PrismaClient,
  restaurantId: string,
): Promise<MenuSnapshot> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, slug: true, currency: true, timezone: true },
  });

  if (!restaurant) {
    throw new Error(`Restaurante ${restaurantId} no encontrado`);
  }

  const [categories, products, combos] = await Promise.all([
    prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
      },
    }),
    prisma.product.findMany({
      where: { restaurantId, isActive: true },
      orderBy: [{ name: 'asc' }],
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        priceRules: {
          where: { isActive: true },
          orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        },
        availabilityWindows: { where: { isActive: true } },
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            group: {
              include: {
                modifiers: {
                  where: { isActive: true },
                  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                },
              },
            },
          },
        },
      },
    }),
    prisma.combo.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return {
    restaurant,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      products: products
        .filter((product) => product.categoryId === category.id)
        .map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          imageUrl: product.imageUrl,
          preparationArea: product.preparationArea,
          isAvailable: product.isAvailable,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            price: variant.price,
            sortOrder: variant.sortOrder,
          })),
          priceRules: product.priceRules.map((rule) => ({
            id: rule.id,
            name: rule.name,
            price: rule.price,
            variantId: rule.variantId,
            daysOfWeek: rule.daysOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            priority: rule.priority,
          })),
          availabilityWindows: product.availabilityWindows.map((window) => ({
            id: window.id,
            daysOfWeek: window.daysOfWeek,
            startTime: window.startTime,
            endTime: window.endTime,
          })),
          modifierGroups: product.modifierGroups
            .filter((link) => link.group.isActive)
            .map((link) => ({
              id: link.group.id,
              name: link.group.name,
              isRequired: link.group.isRequired,
              minSelections: link.group.minSelections,
              maxSelections: link.group.maxSelections,
              sortOrder: link.sortOrder,
              modifiers: link.group.modifiers.map((modifier) => ({
                id: modifier.id,
                name: modifier.name,
                extraPrice: modifier.extraPrice,
                sortOrder: modifier.sortOrder,
              })),
            })),
        })),
    })),
    combos: combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      description: combo.description,
      price: combo.price,
      imageUrl: combo.imageUrl,
      items: combo.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        variantId: item.variantId,
        variantName: item.variant?.name ?? null,
        quantity: item.quantity,
      })),
    })),
    generatedAt: new Date().toISOString(),
  };
}
