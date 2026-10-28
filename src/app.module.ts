import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { MenuModule } from './modules/menu/menu.module';
import { ModifiersModule } from './modules/modifiers/modifiers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('THROTTLE_TTL_SECONDS') * 1000,
            limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
            skipIf: () => config.getOrThrow<string>('NODE_ENV') === 'test',
          },
        ],
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    CatalogModule,
    ModifiersModule,
    MenuModule,
    OrdersModule,
    AccountsModule,
    TaxesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
