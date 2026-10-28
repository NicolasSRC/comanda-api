import { z } from 'zod';

/**
 * Esquema de variables de entorno. Falla al arrancar si falta algo crítico:
 * los secretos solo viven en variables de entorno.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z.string().default('*'),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  SEED_ADMIN_EMAIL: z.email().default('admin@demo.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  SEED_SUPERADMIN_EMAIL: z.email().default('superadmin@comanda.app'),
  SEED_SUPERADMIN_PASSWORD: z.string().min(8).default('Superadmin123!'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${details}`);
  }

  return { ...config, ...result.data };
}
