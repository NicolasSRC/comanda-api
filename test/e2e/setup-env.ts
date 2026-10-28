/**
 * Configuración previa de las pruebas e2e.
 *
 * Las pruebas e2e usan una base de datos real. Para evitar borrar datos de
 * desarrollo, se exige que DATABASE_URL apunte a una base cuyo nombre termine
 * en `_test` o contenga `test`.
 */
process.env.NODE_ENV = 'test';

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!/test/i.test(databaseUrl)) {
  throw new Error(
    'Las pruebas e2e requieren DATABASE_URL apuntando a una base de datos de prueba ' +
      '(el nombre debe contener "test"), por ejemplo: ' +
      'postgresql://postgres:postgres@localhost:5432/comanda_test?schema=public',
  );
}
