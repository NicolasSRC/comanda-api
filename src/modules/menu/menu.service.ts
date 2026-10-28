import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuVersionStatus, Prisma } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { MenuPricingService, type ClockParts } from '../catalog/pricing/menu-pricing.service';
import type {
  CreateMenuVersionDto,
  DuplicateMenuVersionDto,
  QueryMenuVersionsDto,
} from './dto/menu.dto';
import type { MenuSnapshot, SnapshotProduct } from './menu-snapshot.types';
import { MenuSnapshotService } from './menu-snapshot.service';

const versionListSelect = {
  id: true,
  restaurantId: true,
  name: true,
  status: true,
  publishedAt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MenuVersionSelect;

const versionDetailSelect = {
  ...versionListSelect,
  snapshot: true,
} satisfies Prisma.MenuVersionSelect;

export type MenuVersionSummary = Prisma.MenuVersionGetPayload<{
  select: typeof versionListSelect;
}>;
export type MenuVersionDetail = Prisma.MenuVersionGetPayload<{
  select: typeof versionDetailSelect;
}>;

interface PublicProduct {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen: string | null;
  disponible: boolean;
  area: string;
  variantes: Array<{ id: string; nombre: string; precio: number }>;
  gruposModificadores: Array<{
    id: string;
    nombre: string;
    obligatorio: boolean;
    minimo: number;
    maximo: number;
    modificadores: Array<{ id: string; nombre: string; precioExtra: number }>;
  }>;
}

export interface PublicMenu {
  restaurante: {
    nombre: string;
    slug: string;
    moneda: string;
    zonaHoraria: string;
  };
  version: {
    id: string;
    publicadaEn: Date | null;
    estado?: MenuVersionStatus;
  };
  categorias: Array<{
    id: string;
    nombre: string;
    orden: number;
    productos: PublicProduct[];
  }>;
  combos: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    imagen: string | null;
    items: Array<{
      productoId: string;
      producto: string;
      variante: string | null;
      cantidad: number;
    }>;
  }>;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: MenuSnapshotService,
    private readonly pricing: MenuPricingService,
  ) {}

  async createVersion(
    actor: AuthenticatedUser,
    dto: CreateMenuVersionDto,
  ): Promise<MenuVersionDetail> {
    const restaurantId = requireRestaurantId(actor);
    const snapshot = await this.snapshots.build(restaurantId);

    return this.prisma.menuVersion.create({
      data: {
        restaurantId,
        name: dto.name.trim(),
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        createdById: actor.id,
      },
      select: versionDetailSelect,
    });
  }

  async listVersions(
    actor: AuthenticatedUser,
    query: QueryMenuVersionsDto,
  ): Promise<PaginatedResult<MenuVersionSummary>> {
    const restaurantId = requireRestaurantId(actor);

    const where: Prisma.MenuVersionWhereInput = {
      restaurantId,
      ...(query.published ? { status: MenuVersionStatus.PUBLISHED } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.menuVersion.findMany({
        where,
        select: versionListSelect,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.menuVersion.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findVersion(actor: AuthenticatedUser, id: string): Promise<MenuVersionDetail> {
    const restaurantId = requireRestaurantId(actor);

    const version = await this.prisma.menuVersion.findFirst({
      where: { id, restaurantId },
      select: versionDetailSelect,
    });

    if (!version) {
      throw new NotFoundException('Versión de carta no encontrada');
    }

    return version;
  }

  /** RF-19: publicar una versión y archivar la anterior. */
  async publish(actor: AuthenticatedUser, id: string): Promise<MenuVersionSummary> {
    const version = await this.findVersion(actor, id);

    if (version.status === MenuVersionStatus.PUBLISHED) {
      return this.toSummary(version);
    }

    const published = await this.prisma.$transaction(async (tx) => {
      await tx.menuVersion.updateMany({
        where: {
          restaurantId: version.restaurantId,
          status: MenuVersionStatus.PUBLISHED,
          id: { not: version.id },
        },
        data: { status: MenuVersionStatus.ARCHIVED },
      });

      return tx.menuVersion.update({
        where: { id: version.id },
        data: {
          status: MenuVersionStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        select: versionListSelect,
      });
    });

    return published;
  }

  /** RF-19: duplicar una versión existente como nuevo borrador. */
  async duplicate(
    actor: AuthenticatedUser,
    id: string,
    dto: DuplicateMenuVersionDto,
  ): Promise<MenuVersionDetail> {
    const source = await this.findVersion(actor, id);

    return this.prisma.menuVersion.create({
      data: {
        restaurantId: source.restaurantId,
        name: dto.name?.trim() ?? `${source.name} (copia)`,
        status: MenuVersionStatus.DRAFT,
        snapshot: source.snapshot as Prisma.InputJsonValue,
        createdById: actor.id,
      },
      select: versionDetailSelect,
    });
  }

  /** Previsualización autenticada de un borrador, incluidos los agotados. */
  async preview(actor: AuthenticatedUser, id: string): Promise<PublicMenu> {
    const version = await this.findVersion(actor, id);
    const snapshot = version.snapshot as unknown as MenuSnapshot;

    return this.buildPublicPayload(snapshot, version, true);
  }

  /** RF-20: carta publicada de solo lectura, sin datos internos. */
  async getPublicMenu(slug: string): Promise<PublicMenu> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { slug: slug.trim().toLowerCase(), isActive: true },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    const version = await this.prisma.menuVersion.findFirst({
      where: {
        restaurantId: restaurant.id,
        status: MenuVersionStatus.PUBLISHED,
      },
      select: versionDetailSelect,
      orderBy: { publishedAt: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('La carta todavía no está publicada');
    }

    const snapshot = version.snapshot as unknown as MenuSnapshot;
    return this.buildPublicPayload(snapshot, version, false);
  }

  private buildPublicPayload(
    snapshot: MenuSnapshot,
    version: MenuVersionDetail,
    includeUnavailable: boolean,
  ): PublicMenu {
    const clock = this.pricing.getClockParts(new Date(), snapshot.restaurant.timezone);

    const categorias = snapshot.categories
      .map((category) => ({
        id: category.id,
        nombre: category.name,
        orden: category.sortOrder,
        productos: category.products
          .map((product) => this.mapProduct(product, clock, includeUnavailable))
          .filter((product): product is PublicProduct => product !== null),
      }))
      .filter((category) => includeUnavailable || category.productos.length > 0);

    return {
      restaurante: {
        nombre: snapshot.restaurant.name,
        slug: snapshot.restaurant.slug,
        moneda: snapshot.restaurant.currency,
        zonaHoraria: snapshot.restaurant.timezone,
      },
      version: {
        id: version.id,
        publicadaEn: version.publishedAt,
        estado: version.status,
      },
      categorias,
      combos: snapshot.combos.map((combo) => ({
        id: combo.id,
        nombre: combo.name,
        descripcion: combo.description,
        precio: combo.price,
        imagen: combo.imageUrl,
        items: combo.items.map((item) => ({
          productoId: item.productId,
          producto: item.productName,
          variante: item.variantName,
          cantidad: item.quantity,
        })),
      })),
    };
  }

  private mapProduct(
    product: SnapshotProduct,
    clock: ClockParts,
    includeUnavailable: boolean,
  ): PublicProduct | null {
    const available = this.pricing.isProductAvailable(
      { isAvailable: product.isAvailable },
      product.availabilityWindows,
      clock,
    );

    if (!available && !includeUnavailable) {
      return null;
    }

    const variantes = product.variants.map((variant) => ({
      id: variant.id,
      nombre: variant.name,
      precio: this.pricing.resolveEffectivePrice({
        basePrice: product.basePrice,
        variants: product.variants,
        selectedVariantId: variant.id,
        rules: product.priceRules,
        now: clock,
      }).unitPrice,
    }));

    const precio =
      variantes.length > 0
        ? Math.min(...variantes.map((variant) => variant.precio))
        : this.pricing.resolveEffectivePrice({
            basePrice: product.basePrice,
            variants: [],
            rules: product.priceRules,
            now: clock,
          }).unitPrice;

    return {
      id: product.id,
      nombre: product.name,
      descripcion: product.description,
      precio,
      imagen: product.imageUrl,
      disponible: available,
      area: product.preparationArea,
      variantes,
      gruposModificadores: product.modifierGroups.map((group) => ({
        id: group.id,
        nombre: group.name,
        obligatorio: group.isRequired,
        minimo: group.minSelections,
        maximo: group.maxSelections,
        modificadores: group.modifiers.map((modifier) => ({
          id: modifier.id,
          nombre: modifier.name,
          precioExtra: modifier.extraPrice,
        })),
      })),
    };
  }

  private toSummary(version: MenuVersionDetail): MenuVersionSummary {
    return {
      id: version.id,
      restaurantId: version.restaurantId,
      name: version.name,
      status: version.status,
      publishedAt: version.publishedAt,
      createdById: version.createdById,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }
}
