import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar acciones sensibles con filtros (RF-71)' })
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.list(actor, query);
  }
}
