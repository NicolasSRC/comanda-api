import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TipBase } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireRestaurantId } from '../../common/utils/tenant';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { userSelect } from '../users/users.service';
import type {
  CreateRestaurantDto,
  UpdateAccountConfigDto,
  UpdateRestaurantDto,
} from './dto/restaurant.dto';

const accountConfigSelect = {
  pricesIncludeTax: true,
  tipEnabled: true,
  tipSuggestedBps: true,
  tipBase: true,
  discountApprovalThresholdBps: true,
} satisfies Prisma.RestaurantSelect;

type AccountConfigRecord = Prisma.RestaurantGetPayload<{ select: typeof accountConfigSelect }>;

export interface AccountConfigResponse {
  preciosIncluyenImpuesto: boolean;
  propinaHabilitada: boolean;
  propinaSugeridaBps: number;
  basePropina: TipBase;
  umbralAprobacionDescuentoBps: number;
}

export interface CreatedRestaurant {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  };
}

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** RF-06: el superadmin crea el restaurante y su primer administrador. */
  async create(dto: CreateRestaurantDto): Promise<CreatedRestaurant> {
    const slug = dto.slug.trim().toLowerCase();
    const email = dto.adminEmail.trim().toLowerCase();

    const [slugExists, emailExists] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { slug } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);

    if (slugExists) {
      throw new ConflictException('Ya existe un restaurante con ese slug');
    }
    if (emailExists) {
      throw new ConflictException('El correo del administrador ya está registrado');
    }

    const passwordHash = await this.passwords.hash(dto.adminPassword);

    const restaurant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.restaurant.create({
        data: {
          name: dto.name.trim(),
          slug,
          ...(dto.currency ? { currency: dto.currency.toUpperCase() } : {}),
          ...(dto.timezone ? { timezone: dto.timezone } : {}),
        },
      });

      const admin = await tx.user.create({
        data: {
          restaurantId: created.id,
          email,
          passwordHash,
          fullName: dto.adminFullName.trim(),
          role: Role.ADMIN,
        },
        select: userSelect,
      });

      return { restaurant: created, admin };
    });

    return {
      ...restaurant.restaurant,
      admin: {
        id: restaurant.admin.id,
        email: restaurant.admin.email,
        fullName: restaurant.admin.fullName,
        role: restaurant.admin.role,
      },
    };
  }

  async list(page: number, limit: number): Promise<PaginatedResult<unknown>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        orderBy: { name: 'asc' },
        ...paginationArgs(page, limit),
        include: { _count: { select: { users: true } } },
      }),
      this.prisma.restaurant.count(),
    ]);

    return paginated(data, total, page, limit);
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return restaurant;
  }

  /** Datos del restaurante del usuario autenticado (para el panel admin). */
  async findMine(actor: AuthenticatedUser) {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Esta operación requiere un restaurante');
    }

    return this.findOne(actor.restaurantId);
  }

  /** RF-51/RF-52/RF-53: configuración de impuestos, propina y descuentos. */
  async getAccountConfig(actor: AuthenticatedUser): Promise<AccountConfigResponse> {
    const restaurantId = requireRestaurantId(actor);
    const config = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: accountConfigSelect,
    });

    if (!config) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return toAccountConfigResponse(config);
  }

  async updateAccountConfig(
    actor: AuthenticatedUser,
    dto: UpdateAccountConfigDto,
  ): Promise<AccountConfigResponse> {
    const restaurantId = requireRestaurantId(actor);
    const current = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { pricesIncludeTax: true },
    });

    if (!current) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    if (dto.preciosIncluyenImpuesto === true && !current.pricesIncludeTax) {
      const activeTaxes = await this.prisma.tax.count({
        where: { restaurantId, isActive: true },
      });
      if (activeTaxes > 1) {
        throw new ConflictException(
          'Con precios con impuesto incluido solo se permite un impuesto activo',
        );
      }
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(dto.preciosIncluyenImpuesto !== undefined
          ? { pricesIncludeTax: dto.preciosIncluyenImpuesto }
          : {}),
        ...(dto.propinaHabilitada !== undefined ? { tipEnabled: dto.propinaHabilitada } : {}),
        ...(dto.propinaSugeridaBps !== undefined
          ? { tipSuggestedBps: dto.propinaSugeridaBps }
          : {}),
        ...(dto.basePropina !== undefined ? { tipBase: dto.basePropina } : {}),
        ...(dto.umbralAprobacionDescuentoBps !== undefined
          ? { discountApprovalThresholdBps: dto.umbralAprobacionDescuentoBps }
          : {}),
      },
      select: accountConfigSelect,
    });

    return toAccountConfigResponse(updated);
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    await this.findOne(id);

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.toUpperCase() } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const found = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(found);
  }
}

function toAccountConfigResponse(config: AccountConfigRecord): AccountConfigResponse {
  return {
    preciosIncluyenImpuesto: config.pricesIncludeTax,
    propinaHabilitada: config.tipEnabled,
    propinaSugeridaBps: config.tipSuggestedBps,
    basePropina: config.tipBase,
    umbralAprobacionDescuentoBps: config.discountApprovalThresholdBps,
  };
}
