import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiPaginatedResponse } from '../../common/swagger/api-response.decorators';
import { AuditLogModel } from '../../common/swagger/audit.models';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Consultar acciones sensibles con filtros' })
  @ApiPaginatedResponse(AuditLogModel)
  list(@CurrentUser() actor: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.list(actor, query);
  }
}
