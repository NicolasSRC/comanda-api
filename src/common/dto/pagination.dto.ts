import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Paginación común a todos los listados (REQUERIMIENTOS.md §5.3). */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginationArgs(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
