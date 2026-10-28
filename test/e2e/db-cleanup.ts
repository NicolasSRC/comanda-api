import type { PrismaClient } from '@prisma/client';

/**
 * Limpia la base de datos de prueba respetando las claves foráneas.
 * Solo debe usarse contra una base cuyo nombre contenga "test".
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.splitItem.deleteMany();
  await prisma.split.deleteMany();
  await prisma.account.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.menuVersion.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.availabilityWindow.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();
}
