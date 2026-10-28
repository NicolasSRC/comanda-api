#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Ejecutando seed de datos de ejemplo..."
  npx prisma db seed
fi

echo "Iniciando Comanda API..."
exec "$@"
