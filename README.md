# Comanda API

API multi-restaurante para gestionar cartas personalizables, pedidos, cuentas y reportes en restaurantes y bares.

> Especificación funcional: [`REQUERIMIENTOS.md`](./REQUERIMIENTOS.md).
> Especificación técnica y estado por fase: [`ESPECIFICACION.md`](./ESPECIFICACION.md).
> Frontend: [`NicolasSRC/comanda-web`](https://github.com/NicolasSRC/comanda-web).
> Estado: **Fase 5 — Reportes y auditoría** completada (ventas, productos,
> meseros, caja, tiempos de preparación, CSV y registro de acciones sensibles)
> sobre las fases 1 (auth, roles y multi-tenant), 2 (carta, precios y
> disponibilidad), 3 (zonas, mesas y pedidos) y 4 (cuentas, impuestos, propina,
> descuentos, pagos y anulación). La **Fase 6** ya incluye el flujo SSE de
> pedidos y el frontend separado; quedan pendientes la cobertura ≥ 70 %, los logs
> estructurados y las pruebas de carga.

---

## Cómo ver el proyecto

El proyecto completo son dos repositorios: esta API y el frontend
[`comanda-web`](https://github.com/NicolasSRC/comanda-web). La API no incluye
interfaz web; para usar la aplicación hay que levantar ambos.

Requisitos: Docker Desktop con Docker Compose (vía recomendada) y Node.js 22+ con
npm 10+ para el frontend.

### 1. Levantar la API

```bash
git clone https://github.com/NicolasSRC/comanda-api.git
cd comanda-api
cp .env.example .env
docker compose up -d --build
```

Verifica que responde:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up",...}
```

| Recurso | URL |
| ------- | --- |
| API | <http://localhost:3000> |
| Swagger UI | <http://localhost:3000/docs> |
| OpenAPI JSON | <http://localhost:3000/docs/json> |
| Health | <http://localhost:3000/health> |
| Carta demo | <http://localhost:3000/publico/demo/carta> |

El contenedor aplica migraciones y, con `RUN_SEED=true` (por defecto), carga el
restaurante `demo` y los usuarios de prueba.

### 2. Levantar el frontend

En otra terminal:

```bash
git clone https://github.com/NicolasSRC/comanda-web.git
cd comanda-web
npm install
cp .env.example .env
npm run dev
```

Abre <http://localhost:5173>. Vite redirige `/api/*` a `http://localhost:3000`,
así que no hace falta configurar CORS en desarrollo.

### 3. Recorrer la aplicación

| Qué ver | URL | Credenciales |
| ------- | --- | ------------ |
| Carta pública | <http://localhost:5173/> | Sin sesión |
| Login | <http://localhost:5173/login> | Ver credenciales del seed |
| Mesas y pedidos | <http://localhost:5173/app/mesas> | `admin@demo.com` / `Admin123!` o `mesero@demo.com` / `Mesero123!` |
| Cocina y barra | <http://localhost:5173/app/cocina> | `cocina@demo.com` / `Cocina123!` |
| Caja | <http://localhost:5173/app/caja> | `cajero@demo.com` / `Cajero123!` |
| Reportes | <http://localhost:5173/app/reportes> | `admin@demo.com` / `Admin123!` |

Flujo sugerido: abre una mesa y agrega productos como mesero, avanza los ítems
como cocina en otra pestaña, comprueba la actualización en vivo, cobra y cierra
la cuenta como cajero y revisa los reportes como administrador.

La guía detallada del frontend está en el
[README de comanda-web](https://github.com/NicolasSRC/comanda-web#cómo-ver-el-proyecto).

---

## Stack y decisiones

| Tema                | Decisión                                                  | Motivo                                                                            |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Framework           | **NestJS 11**                                             | Módulos, guards e interceptores para roles y multi-tenant; Swagger integrado      |
| Lenguaje            | **TypeScript 5.9 estricto**                               | Seguridad de tipos en el dominio y los cálculos monetarios                        |
| ORM                 | **Prisma 6**                                              | Migraciones versionadas, esquema declarativo y cliente tipado                     |
| Base de datos       | **PostgreSQL 18**                                         | Transacciones, `numeric`/enteros y buen soporte de concurrencia                   |
| Autenticación       | **JWT de acceso + refresh token opaco rotativo**          | Access token corto; refresh con rotación, detección de reutilización y revocación |
| Hash de contraseñas | **Argon2id**                                              | Recomendación OWASP                                                               |
| Validación          | **class-validator + class-transformer**                   | Integración nativa con el `ValidationPipe` de NestJS                              |
| Pruebas             | **Vitest + Supertest**                                    | Rápido con TypeScript; unitarias y e2e                                            |
| Contenedores        | **Docker + Docker Compose**                               | `docker compose up` levanta API y PostgreSQL                                      |
| Tiempo real         | **SSE** (`GET /eventos/pedidos`)                          | Una sola dirección, reconexión automática y más simple que WebSocket              |
| Frontend            | **React 19 + Vite + TypeScript** en `comanda-web`          | Repositorio independiente; consume la API por HTTP y SSE                          |
| Código              | Identificadores en inglés, rutas/mensajes/docs en español | Coincide con los endpoints de la especificación                                   |

Estas decisiones corresponden a la sección 10 de `REQUERIMIENTOS.md`.

---

## Arquitectura

```mermaid
flowchart LR
    Client[Cliente / Swagger] -->|HTTP + JWT| API[NestJS API]
    API --> Guards[Guards: Throttler → JWT → Roles]
    Guards --> Modules[Módulos: auth · usuarios · restaurantes · catálogo · menú · pedidos · cuentas · reportes · auditoría]
    Modules --> Pricing[Motor de precio y disponibilidad]
    Modules --> Orders[Motor de pedidos y estados]
    Modules --> Accounts[Motor de cálculo de cuentas]
    Modules --> Reports[Motor de agregación de reportes]
    Modules --> Prisma[Prisma Client]
    Prisma --> PG[(PostgreSQL 18)]
    API --> Docs[Swagger UI /docs]
    API --> Health[/health]
```

### Estructura del proyecto

```text
.
├── prisma/
│   ├── schema.prisma          # Modelo de datos (Fases 1 a 5)
│   ├── migrations/            # Migraciones versionadas
│   └── seed.ts                # Demo: usuarios, carta, zonas, mesas, IVA y cuentas
├── src/
│   ├── common/                # Guards, decoradores, paginación, filtros, fechas
│   ├── config/                # Validación de variables de entorno (Zod)
│   ├── modules/
│   │   ├── accounts/          # Cuentas, descuentos, propina, pagos y divisiones
│   │   │   └── account-calculator.service.ts  # Motor puro de cálculo
│   │   ├── audit/             # Registro y consulta de acciones sensibles
│   │   ├── auth/              # Login, refresh rotativo, contraseñas
│   │   ├── catalog/           # Categorías, productos, variantes, combos
│   │   │   └── pricing/       # Motor puro de precio y disponibilidad
│   │   ├── health/            # GET /health
│   │   ├── menu/              # Versiones, snapshots y carta pública
│   │   ├── modifiers/         # Grupos y modificadores
│   │   ├── orders/            # Zonas, mesas, pedidos, estados y colas por área
│   │   ├── reports/           # Agregaciones de ventas, caja y tiempos + CSV
│   │   │   └── reports-calculator.service.ts  # Motor puro de reportes
│   │   ├── restaurants/       # Alta de tenants y configuración de cuentas
│   │   ├── taxes/             # Impuestos configurables por restaurante
│   │   └── users/             # CRUD de usuarios del restaurante
│   ├── prisma/                # PrismaService (módulo global)
│   ├── app.module.ts
│   ├── app.setup.ts           # Pipes, CORS y Helmet compartidos
│   └── main.ts                # Bootstrap + Swagger
├── test/e2e/                  # Pruebas de integración con PostgreSQL real
├── docker-compose.yml
├── Dockerfile
└── .github/workflows/ci.yml
```

---

## Inicio rápido con Docker

Requisitos: Docker Desktop con Docker Compose.

```bash
cp .env.example .env
# Edita JWT_ACCESS_SECRET con un valor aleatorio de 32+ caracteres

docker compose up --build
```

Servicios:

- API: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs/json>
- Health: <http://localhost:3000/health>
- Carta demo: <http://localhost:3000/publico/demo/carta>
- PostgreSQL: `localhost:5432` (usuario/clave `comanda` por defecto)

El contenedor de la API aplica las migraciones al arrancar. Con `RUN_SEED=true`
(valor por defecto en Compose) también carga el restaurante demo.

> El proyecto Compose conserva el nombre `comanda` mediante
> `COMPOSE_PROJECT_NAME=comanda` en `.env`. Así se reutilizan el volumen y los
> contenedores existentes aunque la carpeta del repositorio se llame
> `comanda-api`. Si cambias ese valor, Compose creará un proyecto y un volumen
> nuevos.

### Credenciales del seed

| Rol           | Correo                   | Contraseña       |
| ------------- | ------------------------ | ---------------- |
| Superadmin    | `superadmin@comanda.app` | `Superadmin123!` |
| Administrador | `admin@demo.com`         | `Admin123!`      |
| Mesero        | `mesero@demo.com`        | `Mesero123!`     |
| Cocina        | `cocina@demo.com`        | `Cocina123!`     |
| Cajero        | `cajero@demo.com`        | `Cajero123!`     |

> Solo para desarrollo. Cámbialas o desactiva el seed en producción.

---

## Desarrollo local (sin Docker)

Requisitos: Node.js 22+ y PostgreSQL 16+.

```bash
npm install
cp .env.example .env
# Ajusta DATABASE_URL a tu PostgreSQL local

npx prisma migrate dev      # crea la base y aplica migraciones
npm run db:seed             # datos de ejemplo
npm run start:dev           # API con recarga en caliente
```

Si tu PostgreSQL escucha en otro puerto (por ejemplo 5433), cámbialo en
`DATABASE_URL`.

### Variables de entorno

Todas se validan al arrancar con Zod (`src/config/env.validation.ts`). Consulta
[`.env.example`](./.env.example) para la lista completa y sus valores por
defecto. Las más importantes:

| Variable                                  | Descripción                                                  |
| ----------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                            | Cadena de conexión de PostgreSQL                             |
| `JWT_ACCESS_SECRET`                       | Secreto del access token (mínimo 32 caracteres)              |
| `JWT_ACCESS_TTL_SECONDS`                  | Vida del access token (por defecto 900 s)                    |
| `REFRESH_TOKEN_TTL_DAYS`                  | Vida del refresh token (por defecto 30 días)                 |
| `CORS_ORIGINS`                            | Orígenes permitidos, separados por comas (`*` en desarrollo) |
| `THROTTLE_LIMIT` / `THROTTLE_TTL_SECONDS` | Rate limiting global                                         |

---

## Autenticación

1. `POST /auth/login` devuelve un **access token** (JWT, 15 min por defecto) y un
   **refresh token** opaco (30 días).
2. `POST /auth/refresh` rota el refresh token: el anterior queda revocado y se
   emite uno nuevo dentro de la misma familia.
3. Reutilizar un refresh token ya rotado **revoca toda la familia** (detección
   de robo).
4. `POST /auth/logout` revoca la familia del refresh token enviado.
5. El access token se envía como `Authorization: Bearer <token>`.

### Roles

| Rol          | Alcance                                                     |
| ------------ | ----------------------------------------------------------- |
| `SUPERADMIN` | Crea y administra restaurantes (sin `restaurantId`)         |
| `ADMIN`      | Usuarios, carta, configuración y reportes de su restaurante |
| `WAITER`     | Mesas y pedidos propios                                     |
| `KITCHEN`    | Ítems de preparación de su área                             |
| `CASHIER`    | Cierre de cuentas y pagos                                   |

La regla general se aplica en dos capas:

1. `JwtStrategy` valida que el usuario y su restaurante sigan activos.
2. Cada consulta de negocio filtra por `restaurantId` tomado del token, nunca
   del cuerpo o de la URL.

---

## Endpoints de la Fase 1

| Método                  | Ruta                      | Rol          | Descripción                         |
| ----------------------- | ------------------------- | ------------ | ----------------------------------- |
| `GET`                   | `/health`                 | Público      | Estado de API y base de datos       |
| `POST`                  | `/auth/login`             | Público      | Inicio de sesión                    |
| `POST`                  | `/auth/refresh`           | Público      | Rotación del refresh token          |
| `POST`                  | `/auth/logout`            | Público      | Revocación de la sesión             |
| `POST`                  | `/auth/forgot-password`   | Público      | Solicitud de recuperación           |
| `POST`                  | `/auth/reset-password`    | Público      | Restablecimiento con token          |
| `GET`                   | `/auth/me`                | Autenticado  | Perfil actual                       |
| `POST`                  | `/auth/change-password`   | Autenticado  | Cambio de contraseña                |
| `GET/POST/PATCH/DELETE` | `/usuarios`               | `ADMIN`      | Gestión de usuarios del restaurante |
| `POST`                  | `/usuarios/:id/reactivar` | `ADMIN`      | Reactivación (soft delete)          |
| `GET`                   | `/restaurantes/me`        | `ADMIN`      | Restaurante actual                  |
| `POST/GET/PATCH`        | `/restaurantes`           | `SUPERADMIN` | Alta y gestión de tenants           |

En desarrollo, `POST /auth/forgot-password` devuelve `resetToken` en la respuesta
para poder probar el flujo sin proveedor de correo. En producción **no** se
devuelve: debe enviarse por correo.

---

## Endpoints de la Fase 2

Todas las rutas salvo la carta pública exigen `Authorization: Bearer <token>` y
un usuario con restaurante. La carta se administra solo con `ADMIN`; los demás
roles pueden leer categorías, productos, combos y modificadores.

| Método             | Ruta                                          | Rol            | Descripción                                     |
| ------------------ | --------------------------------------------- | -------------- | ----------------------------------------------- |
| `GET/POST`         | `/categorias`                                 | `ADMIN` (POST) | Listar y crear categorías                       |
| `GET/PATCH/DELETE` | `/categorias/:id`                             | `ADMIN`        | Detalle, edición y soft delete                  |
| `GET/POST`         | `/productos`                                  | `ADMIN` (POST) | Listar con filtros y crear productos            |
| `GET/PATCH/DELETE` | `/productos/:id`                              | `ADMIN`        | Detalle con variantes/modificadores y edición   |
| `PATCH`            | `/productos/:id/disponibilidad`               | `ADMIN`        | Marcar agotado o disponible (RF-15)             |
| `GET/POST`         | `/productos/:id/variantes`                    | `ADMIN` (POST) | Variantes con precio propio (RF-12)             |
| `PATCH/DELETE`     | `/productos/:id/variantes/:variantId`         | `ADMIN`        | Edición y soft delete de variantes              |
| `POST/DELETE`      | `/productos/:id/grupos-modificadores`         | `ADMIN`        | Asociar o quitar grupos de modificadores        |
| `GET/POST`         | `/productos/:id/reglas-precio`                | `ADMIN`        | Precios por días y horario (RF-17)              |
| `PATCH/DELETE`     | `/productos/:id/reglas-precio/:ruleId`        | `ADMIN`        | Edición y soft delete de reglas                 |
| `GET/POST`         | `/productos/:id/disponibilidad`               | `ADMIN`        | Ventanas de disponibilidad (RF-16)              |
| `DELETE`           | `/productos/:id/disponibilidad/:windowId`     | `ADMIN`        | Soft delete de una ventana                      |
| `GET/POST`         | `/combos`                                     | `ADMIN` (POST) | Listar y crear combos con productos             |
| `GET/PATCH/DELETE` | `/combos/:id`                                 | `ADMIN`        | Detalle, edición y soft delete                  |
| `GET/POST`         | `/grupos-modificadores`                       | `ADMIN` (POST) | Grupos con mínimo/máximo de selecciones (RF-13) |
| `GET/PATCH/DELETE` | `/grupos-modificadores/:id`                   | `ADMIN`        | Detalle, edición y soft delete                  |
| `GET/POST`         | `/grupos-modificadores/:id/modificadores`     | `ADMIN` (POST) | Modificadores con costo extra (RF-14)           |
| `PATCH/DELETE`     | `/grupos-modificadores/:id/modificadores/:id` | `ADMIN`        | Edición y soft delete de modificadores          |
| `GET/POST`         | `/cartas`                                     | `ADMIN`        | Versiones de carta con snapshot (RF-19)         |
| `GET`              | `/cartas/:id`                                 | `ADMIN`        | Versión con su snapshot completo                |
| `POST`             | `/cartas/:id/publicar`                        | `ADMIN`        | Publica y archiva la anterior                   |
| `POST`             | `/cartas/:id/duplicar`                        | `ADMIN`        | Duplica una versión como borrador               |
| `GET`              | `/cartas/:id/previsualizar`                   | `ADMIN`        | Previsualiza incluyendo agotados                |
| `GET`              | `/publico/:slug/carta`                        | Público        | Carta publicada de solo lectura (RF-20)         |

### Reglas de precio y disponibilidad

- Los precios se guardan como **enteros** en la unidad mínima de la moneda.
- `daysOfWeek` es una máscara de bits: bit 0 = lunes … bit 6 = domingo
  (`127` = todos los días). Las horas usan `HH:mm`.
- Una ventana con `endTime < startTime` cruza la medianoche y la madrugada
  pertenece al día en que empezó. `startTime === endTime` significa todo el día.
- Si un producto tiene ventanas activas, solo está disponible dentro de alguna
  de ellas. Sin ventanas, basta con que no esté agotado ni inactivo.
- Prioridad de precio: regla vigente con mayor `priority` → regla de variante
  sobre regla general → ventana más corta → precio de la variante → precio base.
- Si el producto tiene variantes activas, la variante es obligatoria.
- Las versiones de carta guardan un snapshot JSON de la configuración. El
  precio efectivo y la disponibilidad se resuelven **al leer**, para que las
  reglas por horario sigan vigentes en una carta ya publicada.
- La carta pública oculta productos agotados o fuera de horario y categorías
  vacías. La previsualización autenticada los incluye con `disponible: false`.

---

## Endpoints de la Fase 3

| Método             | Ruta                                  | Rol                          | Descripción                                   |
| ------------------ | ------------------------------------- | ---------------------------- | --------------------------------------------- |
| `GET/POST`         | `/zonas`                              | `ADMIN`                      | Listar y crear zonas                          |
| `GET/PATCH/DELETE` | `/zonas/:id`                          | `ADMIN`                      | Detalle, edición y baja lógica sin mesas      |
| `GET/POST`         | `/mesas`                              | `ADMIN`, `WAITER`            | Listar con filtros y crear mesas              |
| `GET`              | `/mesas/:id`                          | `ADMIN`, `WAITER`            | Mesa con zona y pedido abierto                |
| `PATCH`            | `/mesas/:id`                          | `ADMIN`                      | Editar zona, nombre o capacidad               |
| `POST`             | `/mesas/:id/abrir`                    | `ADMIN`, `WAITER`            | Abrir mesa con comensales y mesero (RF-32)    |
| `POST`             | `/pedidos`                            | `ADMIN`, `WAITER`            | Crear pedido con ítems (RF-40/RF-42)          |
| `GET`              | `/pedidos`                            | `ADMIN`, `WAITER`            | Listar con filtros `mesaId` y `estado`        |
| `GET`              | `/pedidos/:id`                        | `ADMIN`, `WAITER`            | Detalle con ítems, modificadores y total      |
| `POST`             | `/pedidos/:id/items`                  | `ADMIN`, `WAITER`            | Agregar ítems a un pedido abierto (RF-43)     |
| `PATCH`            | `/pedidos/:id/items/:itemId/estado`   | `ADMIN`, `WAITER`, `KITCHEN` | Cambiar estado del ítem (RF-45)               |
| `POST`             | `/pedidos/:id/items/:itemId/cancelar` | `ADMIN`, `WAITER`            | Cancelar con motivo (RF-44)                   |
| `GET`              | `/areas/:area/items-pendientes`       | `ADMIN`, `KITCHEN`           | Cola por área ordenada por antigüedad (RF-47) |
| `POST`             | `/pedidos/:id/mover`                  | `ADMIN`, `WAITER`            | Mover pedido a otra mesa libre (RF-33)        |
| `POST`             | `/pedidos/:id/unir`                   | `ADMIN`, `WAITER`            | Unir ítems en otro pedido abierto (RF-33)     |

Contrato para crear un pedido:

```json
{
  "mesaId": "uuid",
  "comensales": 2,
  "items": [
    {
      "productoId": "uuid",
      "varianteId": "uuid",
      "cantidad": 2,
      "modificadores": [{ "modificadorId": "uuid", "cantidad": 1 }],
      "notas": "Sin cebolla"
    }
  ]
}
```

La respuesta congela `productNameSnapshot`, `variantNameSnapshot`, `unitPrice`,
`modifiersTotal` y `lineTotal`; cambiar la carta después no altera el pedido.
`modifiersTotal` es el extra de toda la línea, así que
`lineTotal = unitPrice × cantidad + modifiersTotal`.

Reglas operativas:

- Un pedido abierto por mesa: comprobación transaccional + índice único parcial
  `orders_one_open_per_table`.
- Transiciones: `PENDING → IN_PREPARATION → READY → SERVED`; `KITCHEN` y
  `WAITER` envían a preparación, `KITCHEN` marca listo, `WAITER` sirve y
  `ADMIN` puede todo.
- La cancelación exige `motivo` (3–300 caracteres) y registra quién y cuándo.
  Un ítem `SERVED` solo lo cancela un `ADMIN`.
- Mover libera la mesa origen; unir mueve los ítems al pedido destino, cancela el
  origen y libera su mesa.
- Errores: `409` mesa ocupada, `403` rol sin permiso, `400` transición inválida o
  producto no disponible, `404` recurso de otro restaurante.

---

## Endpoints de la Fase 4

| Método             | Ruta                                    | Rol                          | Descripción                                   |
| ------------------ | --------------------------------------- | ---------------------------- | --------------------------------------------- |
| `GET`              | `/cuentas?mesaId=`                      | `ADMIN`, `CASHIER`           | Cuenta abierta de una mesa                    |
| `GET`              | `/cuentas/:id`                          | `ADMIN`, `CASHIER`, `WAITER` | Detalle con líneas, impuestos y totales       |
| `POST`             | `/cuentas/:id/descuentos`               | `CASHIER`, `ADMIN`           | Descuento por ítem o por cuenta (RF-53)       |
| `POST`             | `/cuentas/:id/propina`                  | `CASHIER`, `ADMIN`           | Aplicar, cambiar o retirar la propina (RF-52) |
| `POST`             | `/cuentas/:id/pagos`                    | `CASHIER`                    | Pago total, parcial o mixto (RF-55)           |
| `POST`             | `/cuentas/:id/divisiones`               | `CASHIER`                    | División por comensales o por ítems (RF-54)   |
| `POST`             | `/cuentas/:id/cerrar`                   | `CASHIER`                    | Cerrar solo si está totalmente pagada (RF-56) |
| `POST`             | `/cuentas/:id/anular`                   | `ADMIN`                      | Anular una cuenta cerrada con motivo (RF-57)  |
| `GET/PATCH`        | `/restaurantes/me/configuracion-cuenta` | `ADMIN`                      | Impuestos, propina y umbral de descuentos     |
| `GET/POST`         | `/impuestos`                            | `ADMIN`                      | Listar y crear impuestos (RF-51)              |
| `GET/PATCH/DELETE` | `/impuestos/:id`                        | `ADMIN`                      | Detalle, edición y baja lógica                |

La cuenta se crea automáticamente con el pedido. El detalle se calcula en vivo y
los totales persistidos se sincronizan en cada cambio de ítems o movimiento
financiero. Contrato resumido de `GET /cuentas/:id`:

```json
{
  "id": "uuid",
  "estado": "OPEN",
  "subtotal": 48000,
  "descuentos": 4800,
  "impuestos": 8208,
  "propina": 5141,
  "total": 56549,
  "pagado": 20000,
  "saldo": 36549,
  "lineas": [{ "itemId": "uuid", "nombre": "Nachos", "cantidad": 2, "total": 48000 }],
  "impuestosDetalle": [{ "nombre": "IVA", "tasaBps": 1900, "monto": 8208 }],
  "pagos": [{ "metodo": "CASH", "monto": 20000 }],
  "divisiones": []
}
```

Reglas de cálculo y operación:

- Dinero como entero en la unidad mínima; porcentajes en puntos base
  (`10000 = 100 %`).
- Orden: `subtotal → descuentos → impuestos → propina`; nunca hay total
  negativo.
- `pricesIncludeTax = false`: el impuesto se suma sobre la base gravable. Con
  `true`: el impuesto se extrae del precio y la propina se calcula sobre la base.
- `tipBase` puede ser `SUBTOTAL` o `TOTAL`; `POST /cuentas/:id/propina` con
  `porcentajeBps: 0` retira la propina.
- Todo descuento exige `motivo`; superar el umbral configurable (20 % por
  defecto) exige `ADMIN` y registra `approvedById`.
- Los pagos no pueden superar el saldo; se admiten métodos mixtos y pagos
  parciales. Una división por comensales reparte el total en partes iguales y una
  por ítems lo prorratea, ambas con reparto exacto del residuo.
- Cerrar exige `pagado >= total`; el pedido pasa a `CLOSED` y la mesa vuelve a
  `FREE`. La primera operación financiera marca la mesa `TO_CHARGE`.
- Solo se anulan cuentas `CLOSED`; se guardan autor, fecha y motivo. Un pedido con
  pagos o descuentos no se puede unir a otro.

---

## Endpoints de la Fase 5

| Método | Ruta                            | Rol                | Descripción                                         |
| ------ | ------------------------------- | ------------------ | --------------------------------------------------- |
| `GET`  | `/reportes/ventas`              | `ADMIN`            | Ventas por día, semana o mes (RF-60)                |
| `GET`  | `/reportes/ventas.csv`          | `ADMIN`            | Exportación CSV del reporte de ventas (RF-66)       |
| `GET`  | `/reportes/productos`           | `ADMIN`            | Más/menos vendidos y ventas por categoría (RF-61)   |
| `GET`  | `/reportes/meseros`             | `ADMIN`            | Ventas agrupadas por mesero (RF-61)                 |
| `GET`  | `/reportes/caja`                | `ADMIN`, `CASHIER` | Totales por método de pago y día (RF-65)            |
| `GET`  | `/reportes/tiempos-preparacion` | `ADMIN`            | Tiempo promedio por área (RF-64)                    |
| `GET`  | `/auditoria`                    | `ADMIN`            | Acciones sensibles con filtros y paginación (RF-71) |

Filtros comunes de reportes:

- `desde` y `hasta` aceptan `YYYY-MM-DD` o ISO 8601 completo. Una fecha sin hora
  se interpreta como el día completo en la zona horaria del restaurante. Sin
  límites se usan los últimos 30 días.
- `/reportes/ventas` acepta `agrupacion=DIA|SEMANA|MES` (por defecto `DIA`).
- `/reportes/productos` acepta `categoriaId`, `limite` (1–50) y `orden=DESC|ASC`.
- `/reportes/caja` acepta `metodoPago=CASH|CARD|TRANSFER`.
- `/reportes/tiempos-preparacion` acepta `area=KITCHEN|BAR`.

Reglas de los reportes:

- Solo se consideran cuentas `CLOSED`; las `VOIDED` se excluyen de ventas,
  productos, meseros y caja.
- Los productos usan el total bruto de la línea (`lineTotal`) de ítems no
  cancelados, por lo que el reporte no descuenta descuentos ni impuestos.
- La caja agrupa pagos por fecha de pago y método; el ticket promedio es el total
  dividido entre pedidos, redondeado a la unidad mínima.
- El tiempo de preparación es `readyAt - startedAt` de ítems no cancelados con
  ambos tiempos registrados.
- El CSV incluye BOM UTF-8, encabezado, una fila por periodo y una fila `TOTAL`.

Acciones auditadas (RF-70):

| Acción                  | Entidad     | Origen                          |
| ----------------------- | ----------- | ------------------------------- |
| `CANCEL_ITEM`           | `OrderItem` | Cancelación de ítem con motivo  |
| `APPLY_DISCOUNT`        | `Discount`  | Descuento por ítem o por cuenta |
| `VOID_ACCOUNT`          | `Account`   | Anulación de una cuenta cerrada |
| `UPDATE_PRODUCT_PRICE`  | `Product`   | Cambio de `basePrice`           |
| `UPDATE_VARIANT_PRICE`  | `Variant`   | Cambio de precio de variante    |
| `CREATE_PRICE_RULE`     | `PriceRule` | Creación de regla de precio     |
| `UPDATE_PRICE_RULE`     | `PriceRule` | Cambio de precio de una regla   |
| `DEACTIVATE_PRICE_RULE` | `PriceRule` | Baja lógica de una regla        |
| `UPDATE_COMBO_PRICE`    | `Combo`     | Cambio de precio de un combo    |

Cada registro guarda `restaurantId`, usuario, fecha, acción, entidad, `entidadId`,
valores `antes`/`despues` en JSON y `metadata` adicional. `GET /auditoria` acepta
`desde`, `hasta`, `accion`, `entidad`, `entidadId`, `usuarioId`, `page` y `limit`;
por defecto devuelve los últimos 30 días ordenados del más reciente al más antiguo.
El registro se escribe dentro de la misma transacción que la acción auditada.

---

## Endpoints de la Fase 6

| Método | Ruta                     | Rol           | Descripción                                      |
| ------ | ------------------------ | ------------- | ------------------------------------------------ |
| `GET`  | `/eventos/pedidos?token=` | Autenticado   | Flujo SSE de pedidos, ítems y cuentas (RF-48)    |

### Tiempo real por SSE

`GET /eventos/pedidos` mantiene una conexión `text/event-stream`. `EventSource`
no permite enviar cabeceras, así que el access token viaja en la query
`?token=<jwt>`; el servidor lo valida igual que `JwtStrategy` (firma, tipo
`access`, usuario activo y restaurante activo).

Eventos publicados:

| Evento          | Origen                                                        |
| --------------- | ------------------------------------------------------------- |
| `order.opened`  | Apertura de mesa o creación de pedido                         |
| `items.created` | Ítems agregados a un pedido                                   |
| `item.updated`  | Cambio de estado o cancelación de un ítem                     |
| `order.updated` | Mover/unir pedidos, cierre o anulación de cuenta              |
| `ping`          | Latido cada 25 s para conservar la conexión                   |

Cada evento incluye `restaurantId`, `orderId`, `tableId`, `itemId`, `status` y
`at`. El controlador filtra por el `restaurantId` del token, de modo que un
cliente nunca recibe eventos de otro restaurante. El frontend invalida sus
consultas de TanStack Query y mantiene el polling como respaldo.

```bash
# Ejemplo con un access token válido
curl -N "http://localhost:3000/eventos/pedidos?token=$ACCESS_TOKEN"

# event: ping
# id: 1
# data: {"at":"2026-10-28T20:25:29.216Z"}
```

---

## Pruebas

```bash
npm test          # unitarias (sin base de datos)
npm run test:cov  # unitarias + cobertura
npm run test:e2e  # integración con PostgreSQL real
```

Las pruebas e2e exigen una base de datos de prueba:

```bash
# Linux/macOS
DATABASE_URL="postgresql://comanda:comanda@localhost:5432/comanda_test?schema=public" npm run test:e2e

# PowerShell
$env:DATABASE_URL="postgresql://comanda:comanda@localhost:5432/comanda_test?schema=public"
npm run test:e2e
```

Por seguridad, `test/e2e/setup-env.ts` aborta si `DATABASE_URL` no contiene
`test`. Las pruebas incluyen explícitamente el aislamiento entre restaurantes
(RF-05), la resolución de precios, la carta pública, el flujo de pedidos, los
reportes con fixtures de ventas conocidas y la auditoría de acciones sensibles.

Estado actual: **83 pruebas unitarias** y **59 pruebas e2e** en verde. La
cobertura global se recalcula con `npm run test:cov`; los motores puros de
cuentas, precios, estados, ítems y reportes concentran la mayor cobertura. El
umbral del 70 % se activa en la Fase 6, cuando se complete el resto de la lógica
de negocio.

---

## Modelo de datos (Fases 1 a 5)

```mermaid
erDiagram
    RESTAURANTE ||--o{ USUARIO : tiene
    USUARIO ||--o{ REFRESH_TOKEN : posee
    USUARIO ||--o{ PASSWORD_RESET_TOKEN : solicita
    RESTAURANTE ||--o{ CATEGORIA : define
    CATEGORIA ||--o{ PRODUCTO : agrupa
    PRODUCTO ||--o{ VARIANTE : ofrece
    PRODUCTO ||--o{ REGLA_PRECIO : ajusta
    PRODUCTO ||--o{ VENTANA_DISPONIBILIDAD : limita
    PRODUCTO }o--o{ GRUPO_MODIFICADOR : usa
    GRUPO_MODIFICADOR ||--o{ MODIFICADOR : contiene
    RESTAURANTE ||--o{ COMBO : ofrece
    COMBO ||--o{ COMBO_ITEM : incluye
    RESTAURANTE ||--o{ VERSION_CARTA : publica
    RESTAURANTE ||--o{ ZONA : organiza
    ZONA ||--o{ MESA : contiene
    MESA ||--o{ PEDIDO : recibe
    USUARIO ||--o{ PEDIDO : atiende
    PEDIDO ||--o{ ITEM_PEDIDO : incluye
    ITEM_PEDIDO ||--o{ MODIFICADOR_ITEM : personaliza
    RESTAURANTE ||--o{ IMPUESTO : configura
    PEDIDO ||--|| CUENTA : genera
    CUENTA ||--o{ DESCUENTO : aplica
    CUENTA ||--o{ PAGO : recibe
    CUENTA ||--o{ DIVISION : divide
    DIVISION ||--o{ DIVISION_ITEM : asigna
    RESTAURANTE ||--o{ AUDITORIA : registra
    USUARIO ||--o{ AUDITORIA : ejecuta
```

Convenciones aplicadas desde el inicio:

- IDs `UUID`.
- `created_at` / `updated_at` en todas las tablas.
- `restaurant_id` en las tablas de negocio (los usuarios superadmin son la
  excepción, por diseño).
- Soft delete mediante `is_active` en usuarios, restaurantes, carta y zonas; las
  mesas y los pedidos se conservan para el historial.
- Dinero como entero en todas las tablas de carta y pedidos (`base_price`,
  `price`, `extra_price`, `combos.price`, `unit_price`, `modifiers_total`,
  `line_total`) con `CHECK >= 0` en la base de datos.
- Índice único parcial que garantiza una sola carta `PUBLISHED` por restaurante,
  un solo pedido `OPEN` por mesa (`orders_one_open_per_table`) y una sola cuenta
  `OPEN` por mesa (`accounts_one_open_per_table`).
- `line_total = unit_price * quantity + modifiers_total`, verificado con un
  `CHECK` en `order_items`.
- Cuentas, descuentos, pagos y divisiones usan `INTEGER` y `CHECK` de no
  negatividad; los porcentajes se guardan en puntos base y se validan entre 0 y 10000.
- `audit_logs` guarda `action`/`entity_type` como `VARCHAR`, `before`/`after`/
  `metadata` como `JSONB`, usuario opcional e índices por fecha, entidad y acción.

---

## Hoja de ruta

- [x] **Fase 1 — Base:** proyecto, Docker, PostgreSQL, migraciones, auth JWT con
      refresh rotativo, roles, multi-tenant, seed y pruebas de aislamiento.
- [x] **Fase 2 — Carta:** categorías, productos, variantes, modificadores,
      disponibilidad, precios por horario, combos, versiones y carta pública.
- [x] **Fase 3 — Pedidos:** zonas, mesas, pedidos, estados y enrutamiento a
      cocina/barra, con snapshot de precios, cancelación, mover y unir.
- [x] **Fase 4 — Cuentas:** impuestos configurables, propina, descuentos con
      umbral, división por comensales/ítems, pagos mixtos, cierre y anulación.
- [x] **Fase 5 — Reportes y auditoría:** ventas por día/semana/mes, productos y
      categorías, meseros, caja por método de pago, tiempos de preparación, CSV y
      registro de cancelaciones, descuentos, cambios de precio y anulaciones.
- [ ] **Fase 6 — Pulido:**
  - [x] SSE de pedidos e ítems (`GET /eventos/pedidos`).
  - [x] Frontend React separado en
        [`comanda-web`](https://github.com/NicolasSRC/comanda-web) con carta
        pública, mesas, pedidos, cocina/barra, caja y reportes.
  - [ ] Cobertura ≥ 70 % y umbrales activos.
  - [ ] Logs estructurados y correlación de peticiones.
  - [ ] Pruebas de carga y revisión final del contrato OpenAPI.

---

## Decisiones de diseño relevantes

- **Aislamiento explícito:** el `restaurantId` siempre proviene del JWT y se
  incluye en cada `where`. No se acepta como parámetro del cliente. Se prueba
  con e2e que un administrador no puede leer ni modificar usuarios de otro
  restaurante.
- **Refresh tokens opacos:** no se guardan en claro; solo su hash SHA-256. La
  rotación es atómica (`updateMany` con `revokedAt: null`) para evitar carreras.
- **Superadmin sin tenant:** `restaurantId = null`; los endpoints de negocio
  rechazan su uso, por lo que no puede operar dentro de un restaurante.
- **Soft delete:** desactivar usuarios revoca el acceso sin borrar historial;
  además se impide dejar un restaurante sin administradores activos.
- **Validación estricta:** `whitelist` + `forbidNonWhitelisted` rechazan campos
  desconocidos en todos los DTO.
- **Motor de precio puro:** `MenuPricingService` no toca base de datos ni el
  reloj del sistema; recibe el instante ya convertido a la zona del restaurante.
  Eso lo hace determinista y probable con pruebas unitarias.
- **Snapshot + resolución al leer:** la versión guarda la configuración como
  JSON, pero el precio y la disponibilidad se calculan al consultar. Así una
  carta publicada sigue respetando el happy hour sin regenerar la versión.
- **Una sola carta publicada:** además de la transacción que archiva la
  anterior, un índice único parcial en PostgreSQL lo garantiza a nivel de datos.
- **Carta pública sin datos internos:** el contrato expone nombres en español y
  omite `restaurantId`, `isActive` y demás campos operativos.
- **Snapshot del pedido:** cada ítem congela nombres, precio unitario, extras de
  modificadores y total de línea. La carta puede cambiar sin reescribir
  pedidos históricos.
- **Un pedido abierto por mesa:** la transacción lo comprueba y el índice único
  parcial `orders_one_open_per_table` lo garantiza incluso con concurrencia.
- **Estados explícitos:** los ítems solo avanzan por transiciones permitidas y
  cada una exige un rol; cancelar es un endpoint aparte para obligar el motivo y
  registrar autor y fecha.
- **Tiempos de preparación:** `sentAt`, `startedAt`, `readyAt` y `servedAt`
  permiten calcular `preparationSeconds` sin una tabla extra.
- **Zonas y mesas:** las zonas usan baja lógica y no se desactivan con mesas; las
  mesas no se borran para conservar el historial de pedidos.
- **Cuenta por pedido:** se crea automáticamente al abrir o crear el pedido. El
  detalle se calcula en vivo con un motor puro y los totales persistidos se
  sincronizan en cada cambio de ítems o movimiento financiero.
- **Cálculo determinista:** `AccountCalculatorService` recibe ítems, descuentos,
  impuestos y configuración; no consulta la base ni el reloj. El orden es
  subtotal → descuentos → impuestos → propina y cada impuesto/propina se redondea
  una vez.
- **Impuestos incluidos:** con `pricesIncludeTax = true` solo se permite un
  impuesto activo; el impuesto se extrae del precio y la propina no lo vuelve a
  sumar.
- **Descuentos controlados:** todo descuento exige motivo; superar el umbral
  configurable exige `ADMIN` y deja `approvedById`. Los descuentos se acotan al
  valor de la línea o de la cuenta.
- **Pagos y saldo:** no se acepta un pago mayor al saldo ni un cierre con saldo
  pendiente. Los pagos pueden asociarse a una división y validan su saldo.
- **Divisiones exactas:** la división por comensales reparte en partes iguales y
  la división por ítems prorratea el total; ambas usan reparto entero con
  residuo exacto.
- **Anulación:** solo aplica a cuentas cerradas, exige `ADMIN` y guarda autor,
  fecha y motivo; el pedido y sus pagos se conservan para auditoría.
- **Reportes sobre datos persistidos:** las ventas se calculan con cuentas
  `CLOSED` y los productos con el `lineTotal` congelado del ítem; no se recalcula
  la carta histórica. Las fechas sin hora se resuelven en la zona del restaurante
  para que un día contable coincida con el día local.
- **Agregación pura:** `ReportsCalculatorService` recibe filas ya consultadas y no
  toca Prisma ni el reloj, lo que permite probar los totales con fixtures
  deterministas.
- **Auditoría transaccional:** cada acción sensible escribe su registro dentro de
  la misma transacción del cambio, con valores `antes`/`despues` y usuario. Así
  no quedan acciones aplicadas sin rastro ni registros de cambios revertidos.
