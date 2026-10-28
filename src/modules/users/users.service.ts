import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { type PaginatedResult, paginated, paginationArgs } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import type { CreateUserDto, QueryUsersDto, UpdateUserDto } from './dto/user.dto';

export const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  restaurantId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Todo acceso a datos de negocio exige un restaurante en el token (RF-05). */
  private tenantId(actor: AuthenticatedUser): string {
    if (!actor.restaurantId) {
      throw new ForbiddenException('Esta operación requiere un restaurante');
    }
    return actor.restaurantId;
  }

  private assertManageableRole(role: Role): void {
    if (role === Role.SUPERADMIN) {
      throw new BadRequestException('No se puede asignar el rol SUPERADMIN');
    }
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto): Promise<PublicUserRecord> {
    const restaurantId = this.tenantId(actor);
    this.assertManageableRole(dto.role);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await this.passwords.hash(dto.password);

    return this.prisma.user.create({
      data: {
        restaurantId,
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        role: dto.role,
      },
      select: userSelect,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: QueryUsersDto,
  ): Promise<PaginatedResult<PublicUserRecord>> {
    const restaurantId = this.tenantId(actor);

    const where: Prisma.UserWhereInput = {
      restaurantId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { fullName: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(data, total, query.page, query.limit);
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<PublicUserRecord> {
    const restaurantId = this.tenantId(actor);

    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUserRecord> {
    const restaurantId = this.tenantId(actor);
    const target = await this.findOne(actor, id);

    if (dto.role !== undefined) {
      this.assertManageableRole(dto.role);
    }

    const isSelf = target.id === actor.id;
    if (isSelf && dto.isActive === false) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }
    if (isSelf && dto.role !== undefined && dto.role !== target.role) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    if (
      target.role === Role.ADMIN &&
      dto.role !== undefined &&
      dto.role !== Role.ADMIN &&
      (await this.activeAdminCount(restaurantId)) <= 1
    ) {
      throw new BadRequestException(
        'El restaurante debe conservar al menos un administrador activo',
      );
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: userSelect,
    });
  }

  async deactivate(actor: AuthenticatedUser, id: string): Promise<PublicUserRecord> {
    const restaurantId = this.tenantId(actor);
    const target = await this.findOne(actor, id);

    if (target.id === actor.id) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }

    if (target.role === Role.ADMIN && (await this.activeAdminCount(restaurantId)) <= 1) {
      throw new BadRequestException(
        'El restaurante debe conservar al menos un administrador activo',
      );
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data: { isActive: false },
      select: userSelect,
    });
  }

  async reactivate(actor: AuthenticatedUser, id: string): Promise<PublicUserRecord> {
    const target = await this.findOne(actor, id);

    return this.prisma.user.update({
      where: { id: target.id },
      data: { isActive: true },
      select: userSelect,
    });
  }

  private activeAdminCount(restaurantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { restaurantId, role: Role.ADMIN, isActive: true },
    });
  }
}
