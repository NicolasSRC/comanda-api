# Comanda — Especificación técnica y estado del proyecto

- **Documento base:** [`REQUERIMIENTOS.md`](./REQUERIMIENTOS.md) v1.0
- **Versión de este documento:** 1.2
- **Fecha:** 2026-10-28
- **Estado general:** Fases 1, 2, 3, 4 y 5 completadas y verificadas. Fase 6 es la siguiente.
- **Alcance:** MVP descrito en la sección 1.2 de los requerimientos.

### Leyenda de estado

| Símbolo | Significado                                        |
| ------- | -------------------------------------------------- |
| ✅      | Implementado y verificado                          |
| 🟡      | Parcial o escrito pero no validado en este entorno |
| ⬜      | Pendiente                                          |

---

## 1. Resumen ejecutivo

Comanda es una API REST multi-restaurante para configurar cartas, tomar pedidos por mesa, prepararlos en cocina o barra y cerrar cuentas con impuestos, propinas, descuentos, división y pagos mixtos.

La **Fase 1 (Base)** está terminada:

- Proyecto NestJS 11 con TypeScript estricto, ESLint y Prettier.
- PostgreSQL 18 con Prisma 6 y migraciones versionadas.
- Autenticación con JWT de acceso y refresh token opaco con rotación, detección de reutilización y revocación.
- Roles y permisos por endpoint.
- Aislamiento multi-restaurante verificado con pruebas e2e.
- Gestión de usuarios y alta de restaurantes por el superadmin.
- Seed, Docker Compose, CI y documentación.
- **10 pruebas unitarias + 12 pruebas e2e en verde**, además de `lint`, `typecheck` y `build`.

La **Fase 2 (Carta)** también está terminada:

- Categorías, productos, variantes y combos aislados por restaurante.
- Grupos de modificadores con mínimo/máximo de selecciones y costo extra.
- Disponibilidad inmediata (agotado) y por franjas horarias con cruce de medianoche.
- Reglas de precio por días y horario, con prioridad y especificidad de variante.
- Versiones de carta (borrador/publicada/archivada), duplicado y snapshot JSON.
- Carta pública de solo lectura en `GET /publico/:slug/carta`.
- Motor de precio puro con **20 pruebas unitarias** propias.
- **30 pruebas unitarias + 21 pruebas e2e en verde**; Docker Compose validado.

La **Fase 3 (Pedidos)** también está terminada:

- Zonas y mesas con capacidad y estado operativo (`FREE`, `OCCUPIED`, `TO_CHARGE`).
- Apertura de mesa con comensales y mesero, y creación de pedidos con ítems.
- Snapshot de nombre de producto, variante, precio unitario, extras de modificadores y total de línea.
- Validación de disponibilidad, variantes obligatorias y mínimos/máximos de modificadores al crear cada ítem.
- Enrutamiento automático a cocina o barra según el producto.
- Transiciones `PENDING → IN_PREPARATION → READY → SERVED` con permisos por rol y registro de tiempos.
- Cancelación con motivo obligatorio; un ítem servido solo lo anula un administrador.
- Cola por área ordenada por antigüedad, movimiento de pedidos y unión de pedidos.
- Un solo pedido abierto por mesa garantizado con índice único parcial.
- **21 pruebas unitarias nuevas (51 en total) y 13 pruebas e2e nuevas (34 en total)**.

La **Fase 4 (Cuentas)** también está terminada:

- Impuestos configurables por restaurante, con precios con impuesto incluido o excluido.
- Cuenta creada automáticamente con el pedido y sincronizada ante cambios de ítems o de mesa.
- Motor puro de cálculo: subtotal → descuentos → impuestos → propina, sin totales negativos.
- Descuentos por ítem o cuenta con motivo y umbral configurable de aprobación por administrador.
- Propina configurable y removible, con base `SUBTOTAL` o `TOTAL`.
- Pagos parciales y mixtos, división por comensales o por ítems y cierre solo con saldo cero.
- Anulación de cuentas cerradas con motivo, autor y fecha.
- **11 pruebas unitarias nuevas (62 en total) y 8 pruebas e2e nuevas (42 en total)**.

Lo que falta está detallado por fase en la sección 12.

---

## 2. Estado por fase

| Fase                        | Alcance                                                                                   | Estado | Evidencia                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| **1. Base**                 | Proyecto, Docker, PostgreSQL, migraciones, auth, roles, multi-tenant                      | ✅     | `npm test`, `npm run test:e2e`, smoke test HTTP                                                 |
| **2. Carta**                | Categorías, productos, variantes, modificadores, horarios, precios, combos, carta pública | ✅     | `src/modules/catalog`, `src/modules/modifiers`, `src/modules/menu`, `test/e2e/menu.e2e-spec.ts` |
| **3. Pedidos**              | Zonas, mesas, pedidos, estados, enrutamiento cocina/barra                                 | ✅     | `src/modules/orders`, `test/e2e/orders.e2e-spec.ts`                                             |
| **4. Cuentas**              | Cálculo de valores, impuestos, propina, descuentos, división, pagos                       | ✅     | `src/modules/accounts`, `src/modules/taxes`, `test/e2e/accounts.e2e-spec.ts`                    |
| **5. Reportes y auditoría** | Ventas, productos, caja, registro de acciones sensibles                                   | ✅     | `src/modules/reports`, `src/modules/audit`, `test/e2e/reports.e2e-spec.ts`                      |
| **6. Pulido**               | Cobertura ≥ 70 %, SSE, frontend mínimo, documentación final                               | ⬜     | —                                                                                               |

### Verificación ejecutada

| Comando                               | Resultado                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run typecheck`                   | ✅ 0 errores                                                                  |
| `npm run lint`                        | ✅ 0 errores                                                                  |
| `npm run build`                       | ✅ compila a `dist/`                                                          |
| `npm test`                            | ✅ 83/83                                                                      |
| `npm run test:e2e`                    | ✅ 59/59                                                                      |
| `npm run test:cov`                    | ✅ cobertura global 13,76 %; motor de cuentas 93,90 %; pedidos puros al 100 % |
| `GET /health`                         | ✅ `{"status":"ok","database":"up"}`                                          |
| `POST /auth/login` + `GET /auth/me`   | ✅ token válido y perfil correcto                                             |
| `GET /publico/demo/carta`             | ✅ 200 con carta publicada, precios y variantes                               |
| `GET /docs`                           | ✅ Swagger UI responde 200                                                    |
| Flujo de pedidos (e2e)                | ✅ mesa → pedido → cocina/barra → listo → servido                             |
| Flujo de cuentas (e2e)                | ✅ descuento → propina → pagos mixtos → división → cierre → anulación         |
| Reportes (e2e)                        | ✅ ventas, productos, meseros, caja, tiempos y CSV con fixtures conocidas     |
| Auditoría (e2e)                       | ✅ acciones sensibles, filtros, paginación, aislamiento y roles               |
| Impuestos y configuración (e2e)       | ✅ IVA, propina sugerida, umbral de descuento y aislamiento por restaurante   |
| `docker compose up -d --build`        | ✅ API y PostgreSQL saludables; migraciones y seed ejecutados                 |
| `GET /mesas` + cola por área (Docker) | ✅ imagen con Fase 3; 5 mesas demo y cola de cocina consultadas               |

---

## 3. Decisiones de arquitectura

| Tema                | Decisión                                                     | Motivo                                                                             | Alternativas descartadas                  |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| Framework           | **NestJS 11**                                                | Módulos, guards, pipes y Swagger integrados; estructura adecuada para multi-tenant | Express (más simple, menos estructura)    |
| Lenguaje            | **TypeScript 5.9 estricto**                                  | Tipado del dominio y de los cálculos monetarios                                    | JavaScript                                |
| ORM                 | **Prisma 6.19**                                              | Migraciones versionadas, esquema declarativo, cliente tipado                       | Drizzle                                   |
| Base de datos       | **PostgreSQL 18**                                            | Transacciones, índices parciales, concurrencia                                     | MySQL, SQLite                             |
| Autenticación       | **JWT de acceso + refresh opaco rotativo**                   | Access corto; refresh revocable, rotativo y con detección de reutilización         | Sesiones en base de datos, JWT de refresh |
| Hash de contraseñas | **Argon2id** (19 MiB, 2 pasadas, 1 hilo)                     | Recomendación OWASP                                                                | bcrypt                                    |
| Validación          | **class-validator** en DTOs + **Zod** para el entorno        | Integración con `ValidationPipe`; el entorno falla al arrancar si es inválido      | Zod en todos los DTOs                     |
| Pruebas             | **Vitest + Supertest**                                       | Rápido con TypeScript; unitarias y e2e                                             | Jest                                      |
| Contenedores        | **Docker + Compose**                                         | `docker compose up` levanta API y base de datos                                    | Instalación manual                        |
| Dinero              | **Entero en unidad mínima**                                  | Evita errores de coma flotante                                                     | `decimal`, `float`                        |
| Porcentajes         | **Puntos base (bps)**: 10000 = 100 %                         | Aritmética entera y precisa                                                        | `float`                                   |
| IDs                 | **UUID v4**                                                  | No expone secuencias y facilita integraciones                                      | Enteros autoincrementales                 |
| Idioma              | Código en inglés; rutas, mensajes, Swagger y docs en español | Coincide con los endpoints de la especificación                                    | Todo en inglés                            |
| Multi-tenancy       | **Filtro explícito por `restaurantId` en cada consulta**     | Simple, auditable y difícil de eludir por accidente                                | Row-Level Security, middleware global     |
| Tiempo real         | **SSE** (propuesto, Fase 6)                                  | Una sola dirección y más simple que WebSocket                                      | WebSocket                                 |
| Frontend            | **Pendiente de decisión** (Fase 6)                           | No bloquea el MVP de la API                                                        | Solo API                                  |

### Decisiones de diseño relevantes

1. **El `restaurantId` siempre sale del JWT**, nunca del cuerpo, la URL o un encabezado. El superadmin tiene `restaurantId = null` y recibe `403` en endpoints de negocio.
2. **El correo es único a nivel global.** Esto permite iniciar sesión solo con correo y contraseña. Limitación: una misma persona no puede pertenecer a dos restaurantes con el mismo correo; se resolvería con invitaciones o cuentas separadas.
3. **El refresh token es opaco** (64 bytes aleatorios en base64url). En la base solo se guarda su SHA-256, junto con `familyId` para revocar la sesión completa.
4. **Los tokens de autenticación no llevan `restaurantId`** en la tabla porque cuelgan del usuario; son la excepción documentada a la convención de la sección 6.2.
5. **Soft delete:** los usuarios se desactivan (`isActive = false`), no se borran. Los restaurantes también tienen `isActive`.
6. **No se puede dejar un restaurante sin administradores activos.** Se valida al desactivar o cambiar el rol de un `ADMIN`.
7. **Los errores de Prisma se traducen** a `404`, `409` o `500` con un filtro global.

---

## 4. Arquitectura implementada

```mermaid
flowchart LR
    Client[Cliente / Swagger] -->|HTTP + Bearer JWT| API[NestJS]
    API --> Throttler[ThrottlerGuard]
    Throttler --> JWT[JwtAuthGuard]
    JWT --> Roles[RolesGuard]
    Roles --> Modules[Módulos de negocio]
    Modules --> Prisma[Prisma Client]
    Prisma --> PG[(PostgreSQL 18)]
    API --> Docs[Swagger /docs]
    API --> Health[GET /health]
```

### Capas y responsabilidades

| Capa                  | Archivos                                        | Responsabilidad                                            |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Bootstrap             | `src/main.ts`, `src/app.setup.ts`               | Helmet, CORS, validación global, Swagger, apagado ordenado |
| Seguridad transversal | `src/common/guards/*`                           | Autenticación JWT y autorización por rol                   |
| Errores               | `src/common/filters/prisma-exception.filter.ts` | Traducir errores de Prisma                                 |
| Configuración         | `src/config/env.validation.ts`                  | Validar variables de entorno con Zod                       |
| Persistencia          | `src/prisma/*`                                  | Cliente Prisma global                                      |
| Dominio               | `src/modules/*`                                 | Controladores, servicios y DTOs por módulo                 |
| Pruebas               | `src/**/*.spec.ts`, `test/e2e/*`                | Unitarias y e2e                                            |

### Orden de ejecución por petición

1. `ThrottlerGuard` aplica el límite global (120 req/min por defecto).
2. `JwtAuthGuard` valida el access token salvo en rutas `@Public()`.
3. `JwtStrategy` recarga el usuario y valida que el usuario y su restaurante sigan activos.
4. `RolesGuard` comprueba el rol exigido por `@Roles(...)`.
5. `ValidationPipe` valida y transforma el DTO (rechaza campos desconocidos).
6. El controlador delega en el servicio, que filtra por `restaurantId`.

### Estructura del repositorio

```text
.
├── .github/workflows/ci.yml
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── docker-entrypoint.sh
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20261027213616_init/migration.sql
│   │   ├── 20261027230244_menu/migration.sql
│   │   └── 20261027234153_orders/migration.sql
│   └── seed.ts
├── src/
│   ├── common/
│   │   ├── decorators/       # @Public, @Roles, @CurrentUser
│   │   ├── dto/              # Paginación común
│   │   ├── filters/          # Filtro de errores Prisma
│   │   ├── guards/           # JWT y roles
│   │   ├── interfaces/       # Usuario autenticado y payload JWT
│   │   └── utils/            # requireRestaurantId (tenant)
│   ├── config/               # Validación del entorno
│   ├── modules/
│   │   ├── auth/             # Login, refresh, logout, contraseñas
│   │   ├── catalog/          # Categorías, productos, variantes, combos
│   │   │   └── pricing/      # Motor de precio + reglas y ventanas
│   │   ├── health/
│   │   ├── menu/             # Versiones, snapshot y carta pública
│   │   ├── modifiers/        # Grupos y modificadores
│   │   ├── orders/           # Zonas, mesas, pedidos, estados y colas por área
│   │   ├── restaurants/
│   │   └── users/
│   ├── prisma/
│   ├── app.module.ts
│   ├── app.setup.ts
│   └── main.ts
├── test/
│   ├── e2e/                  # auth, menu y orders + limpieza compartida
│   └── setup-unit.ts
├── README.md
└── REQUERIMIENTOS.md
```

### Flujo de autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /auth/login {email, password}
    A->>DB: Buscar usuario + restaurante
    A->>A: Verificar Argon2id y estado activo
    A->>DB: Crear refresh token (hash SHA-256, familyId)
    A-->>C: accessToken + refreshToken + usuario

    C->>A: POST /auth/refresh {refreshToken}
    A->>DB: Buscar token por hash
    alt token revocado
        A->>DB: Revocar toda la familia
        A-->>C: 401
    else token válido
        A->>DB: Reclamar token (updateMany atómico)
        A->>DB: Crear nuevo token en la misma familia
        A-->>C: nuevo accessToken + nuevo refreshToken
    end

    C->>A: POST /auth/logout {refreshToken}
    A->>DB: Revocar familia
    A-->>C: 200
```

---

## 5. Modelo de datos

### 5.1 Implementado (Fase 1)

Migración aplicada: `prisma/migrations/20261027213616_init/migration.sql`.

```text
restaurants
  id          uuid PK
  name        varchar(120) NOT NULL
  slug        varchar(80) UNIQUE NOT NULL
  currency    varchar(3) NOT NULL DEFAULT 'COP'
  timezone    varchar(60) NOT NULL DEFAULT 'America/Bogota'
  is_active   boolean NOT NULL DEFAULT true
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL

users
  id             uuid PK
  restaurant_id  uuid NULL REFERENCES restaurants(id) ON DELETE RESTRICT
  email          varchar(255) UNIQUE NOT NULL
  password_hash  text NOT NULL
  full_name      varchar(120) NOT NULL
  role           enum(SUPERADMIN, ADMIN, WAITER, KITCHEN, CASHIER) NOT NULL
  is_active      boolean NOT NULL DEFAULT true
  last_login_at  timestamptz NULL
  created_at     timestamptz NOT NULL DEFAULT now()
  updated_at     timestamptz NOT NULL
  INDEX (restaurant_id, role)
  INDEX (restaurant_id, is_active)

refresh_tokens
  id                    uuid PK
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  token_hash            text UNIQUE NOT NULL          -- SHA-256 del token opaco
  family_id             uuid NOT NULL
  expires_at            timestamptz NOT NULL
  revoked_at            timestamptz NULL
  replaced_by_token_id  uuid NULL
  created_by_ip         varchar(64) NULL
  user_agent            text NULL
  created_at            timestamptz NOT NULL DEFAULT now()
  INDEX (user_id), INDEX (family_id), INDEX (expires_at)

password_reset_tokens
  id          uuid PK
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  token_hash  text UNIQUE NOT NULL
  expires_at  timestamptz NOT NULL
  used_at     timestamptz NULL
  created_at  timestamptz NOT NULL DEFAULT now()
  INDEX (user_id), INDEX (expires_at)
```

```mermaid
erDiagram
    RESTAURANTE ||--o{ USUARIO : tiene
    USUARIO ||--o{ REFRESH_TOKEN : posee
    USUARIO ||--o{ PASSWORD_RESET_TOKEN : solicita
```

**Excepción deliberada:** `restaurant_id` es nullable en `users` para el superadmin y no existe en las tablas de tokens, que pertenecen a un usuario.

### 5.2 Implementado (Fase 2)

Migración aplicada: `prisma/migrations/20261027230244_menu/migration.sql`.

```text
categories
  id, restaurant_id, name, description?, sort_order, is_active, timestamps
  UNIQUE (restaurant_id, name)

products
  id, restaurant_id, category_id, name, description?, base_price int,
  image_url?, preparation_area enum(KITCHEN, BAR), is_available bool,
  is_active bool, timestamps
  UNIQUE (restaurant_id, name)
  INDEX (restaurant_id, category_id, is_active)
  INDEX (restaurant_id, preparation_area)

variants
  id, restaurant_id, product_id, name, price int, sort_order, is_active, timestamps
  UNIQUE (product_id, name)

modifier_groups
  id, restaurant_id, name, is_required bool, min_selections int, max_selections int,
  sort_order, is_active, timestamps
  UNIQUE (restaurant_id, name)
  CHECK (min_selections >= 0 AND max_selections >= min_selections)

modifiers
  id, restaurant_id, group_id, name, extra_price int DEFAULT 0, sort_order,
  is_active, timestamps
  UNIQUE (group_id, name)

product_modifier_groups
  product_id, group_id, sort_order
  PK (product_id, group_id)

price_rules                          -- ReglaPrecio de la especificación
  id, restaurant_id, product_id, variant_id?, name, price int,
  days_of_week smallint,             -- bitmask: bit 0 = lunes … bit 6 = domingo
  start_time varchar(5), end_time varchar(5),   -- HH:mm; end < start cruza medianoche
  priority int, is_active bool, timestamps
  UNIQUE (product_id, name)

availability_windows
  id, restaurant_id, product_id, days_of_week smallint,
  start_time varchar(5), end_time varchar(5), is_active bool, timestamps

combos
  id, restaurant_id, name, description?, price int, image_url?, is_active, timestamps
  UNIQUE (restaurant_id, name)

combo_items
  id, restaurant_id, combo_id, product_id, variant_id?, quantity int

menu_versions                        -- RF-19
  id, restaurant_id, name, status enum(DRAFT, PUBLISHED, ARCHIVED),
  snapshot jsonb, published_at?, created_by_id?, timestamps
  UNIQUE INDEX (restaurant_id) WHERE status = 'PUBLISHED'
```

```mermaid
erDiagram
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
```

Integridad aplicada en la base de datos:

- `CHECK` de precios y costos extra `>= 0`; cantidad de combo `> 0`.
- `CHECK` de rango de selecciones en grupos de modificadores.
- `CHECK` de `days_of_week BETWEEN 1 AND 127` y formato `HH:mm` en horas.
- Índice único parcial: una sola versión `PUBLISHED` por restaurante.
- FKs con `ON DELETE RESTRICT` para catálogo y `CASCADE` para hijos de producto
  o combo; `menu_versions` usa `CASCADE` desde el restaurante y `SET NULL` para
  el usuario creador.

Reglas de la carta implementadas en `MenuPricingService`:

- El precio efectivo se resuelve así: regla de precio vigente (mayor `priority`
  → la que fija variante → ventana más corta) → precio de la variante → precio
  base. El servicio no consulta la base ni el reloj: recibe el instante ya
  convertido a la zona horaria del restaurante.
- Si el producto tiene variantes activas, la variante es obligatoria y debe
  estar activa.
- `is_available = false` bloquea nuevos ítems, pero no modifica pedidos
  existentes (regla 5).
- Con `availability_windows` activas, el producto solo está disponible dentro de
  alguna ventana. Sin ventanas, basta con que esté activo y disponible.
- `start_time == end_time` significa todo el día; `end_time < start_time` cruza
  la medianoche y la madrugada pertenece al día en que comenzó la ventana.
- Los grupos de modificadores se comparten por restaurante y se asocian a
  productos; `min_selections` y `max_selections` se validan al construir el ítem
  (`validateModifierSelection`), incluido el costo extra por cantidad.
- La carta pública solo expone la última versión `PUBLISHED`. La
  previsualización autenticada incluye productos agotados con
  `disponible: false`, pero la carta pública los omite.
- El snapshot de la versión se congela al crearla, pero el precio y la
  disponibilidad se resuelven al leer para respetar reglas horarias dinámicas.

### 5.3 Implementado (Fase 3)

Migración aplicada: `prisma/migrations/20261027234153_orders/migration.sql`.

```text
zones
  id, restaurant_id, name, sort_order, is_active, timestamps
  UNIQUE (restaurant_id, name)
  INDEX (restaurant_id, is_active, sort_order)

tables
  id, restaurant_id, zone_id, name, capacity, status enum(FREE, OCCUPIED, TO_CHARGE),
  timestamps
  UNIQUE (restaurant_id, name)
  INDEX (restaurant_id, zone_id, status)
  CHECK (capacity > 0)

orders
  id, restaurant_id, table_id, waiter_id, status enum(OPEN, CLOSED, CANCELLED),
  guests int, notes?, opened_at, closed_at?, timestamps
  INDEX (restaurant_id, status, opened_at), INDEX (table_id)
  CHECK (guests > 0)
  UNIQUE INDEX (table_id) WHERE status = 'OPEN'   -- un pedido activo por mesa

order_items
  id, restaurant_id, order_id, product_id, variant_id?,
  product_name_snapshot, variant_name_snapshot,
  quantity int, unit_price int, modifiers_total int, line_total int,
  notes?, preparation_area enum(KITCHEN, BAR),
  status enum(PENDING, IN_PREPARATION, READY, SERVED, CANCELLED),
  created_at, sent_at?, started_at?, ready_at?, served_at?,
  cancelled_at?, cancelled_by_id?, cancel_reason?
  INDEX (restaurant_id, preparation_area, status, created_at)
  INDEX (restaurant_id, order_id)
  CHECK (quantity > 0)
  CHECK (line_total = unit_price * quantity + modifiers_total)

order_item_modifiers
  id, restaurant_id, order_item_id, modifier_id, name_snapshot,
  extra_price int, quantity int
  CHECK (extra_price >= 0 AND quantity > 0)
```

Notas de implementación:

- `modifiers_total` es el extra de **toda la línea** (extra por unidad × cantidad
  del ítem), no por unidad. La fórmula es
  `line_total = unit_price * quantity + modifiers_total`.
- Los ítems guardan nombres, precio unitario y extras congelados. Cambiar la
  carta después no altera pedidos existentes.
- `tables` no tiene baja lógica: se conserva para el historial. Las zonas usan
  `is_active` y no se pueden desactivar mientras tengan mesas.
- El índice único parcial `orders_one_open_per_table` garantiza un solo pedido
  `OPEN` por mesa, además de la comprobación transaccional del servicio.
- Se registran `created_at`, `sent_at`, `started_at`, `ready_at`, `served_at`,
  `cancelled_at` y `cancelled_by_id`. La respuesta expone `preparationSeconds`
  cuando existen inicio y fin de preparación.

Transiciones permitidas:

```text
PENDING ──► IN_PREPARATION ──► READY ──► SERVED
   │              │              │
   └──────────────┴──────────────┴──► CANCELLED
```

| Acción                         | Rol                | Regla                                                       |
| ------------------------------ | ------------------ | ----------------------------------------------------------- |
| Crear pedido e ítems           | `WAITER`/`ADMIN`   | Mesa libre, producto disponible, reglas de modificadores    |
| Abrir mesa                     | `WAITER`/`ADMIN`   | Crea el pedido abierto y marca la mesa `OCCUPIED`           |
| Enviar a preparación           | `WAITER`/`KITCHEN` | `PENDING → IN_PREPARATION`                                  |
| Marcar listo                   | `KITCHEN`          | `IN_PREPARATION → READY`                                    |
| Marcar servido                 | `WAITER`           | `READY → SERVED`                                            |
| Cancelar ítem                  | `WAITER`/`ADMIN`   | Motivo obligatorio; si está `SERVED`, solo `ADMIN`          |
| Agregar ítems a pedido enviado | `WAITER`/`ADMIN`   | RF-43; nuevos ítems en `PENDING`                            |
| Mover pedido                   | `WAITER`/`ADMIN`   | Mesa destino libre; libera la mesa origen                   |
| Unir pedidos                   | `WAITER`/`ADMIN`   | Ambos abiertos; el origen queda `CANCELLED` y su mesa libre |

Snapshot obligatorio al crear el ítem: nombre de producto, nombre de variante, precio unitario, extras de modificadores y total de línea. Los cambios posteriores de carta no alteran el pedido (regla 6).

### 5.4 Modelo propuesto para las fases 4–5

> Diseño de referencia. Los nombres y campos pueden ajustarse al implementar cada fase, pero las convenciones (UUID, `restaurant_id`, timestamps, dinero entero, soft delete) se mantienen.

#### Fase 4 — Cuentas

```text
restaurants (campos nuevos)
  prices_include_tax boolean DEFAULT false
  tip_enabled boolean DEFAULT true
  tip_suggested_bps int DEFAULT 1000
  tip_base enum(SUBTOTAL, TOTAL) DEFAULT TOTAL
  discount_approval_threshold_bps int DEFAULT 2000

taxes
  id, restaurant_id, name, rate_bps int, is_active, sort_order, timestamps

accounts
  id, restaurant_id, table_id, order_id UNIQUE,
  status enum(OPEN, CLOSED, VOIDED),
  subtotal int, discount_total int, tax_total int, tip_total int,
  total int, paid_total int, tip_bps int,
  opened_by_id, closed_by_id?, closed_at?,
  voided_by_id?, voided_at?, void_reason?,
  timestamps
  UNIQUE INDEX (table_id) WHERE status = 'OPEN'
  CHECK (subtotal >= 0 AND discount_total >= 0 AND tax_total >= 0 AND tip_total >= 0)
  CHECK (total >= 0 AND paid_total >= 0)

discounts
  id, restaurant_id, account_id, order_item_id?,
  scope enum(ITEM, ACCOUNT), type enum(PERCENT, FIXED),
  value int,                          -- PERCENT: bps; FIXED: unidad mínima
  reason text NOT NULL,
  applied_by_id, approved_by_id?, created_at

payments
  id, restaurant_id, account_id, split_id?,
  method enum(CASH, CARD, TRANSFER), amount int,
  reference?, received_by_id, created_at

splits
  id, restaurant_id, account_id, label, amount int, created_at

split_items
  id, restaurant_id, split_id, order_item_id, quantity int, amount int
```

#### Fase 5 — Auditoría

```text
audit_logs
  id, restaurant_id, user_id?,
  action varchar(80),                -- CANCEL_ITEM, APPLY_DISCOUNT, VOID_ACCOUNT…
  entity_type varchar(60), entity_id uuid,
  before jsonb?, after jsonb?, metadata jsonb?,
  ip varchar(64)?, user_agent text?, created_at
  INDEX (restaurant_id, created_at DESC)
  INDEX (restaurant_id, entity_type, entity_id)
  INDEX (restaurant_id, action, created_at DESC)
```

Estado: **implementado** en la migración `20261028003541_reports_audit`, junto
con los índices de reportes `accounts(restaurant_id, status, closed_at)`,
`payments(restaurant_id, created_at)` y
`order_items(restaurant_id, preparation_area, ready_at)`.

#### Diagrama objetivo

```mermaid
erDiagram
    RESTAURANTE ||--o{ USUARIO : tiene
    RESTAURANTE ||--o{ ZONA : tiene
    ZONA ||--o{ MESA : contiene
    RESTAURANTE ||--o{ CATEGORIA : define
    CATEGORIA ||--o{ PRODUCTO : agrupa
    PRODUCTO ||--o{ VARIANTE : ofrece
    PRODUCTO ||--o{ REGLA_PRECIO : aplica
    PRODUCTO ||--o{ VENTANA_DISPONIBILIDAD : limita
    PRODUCTO }o--o{ GRUPO_MODIFICADOR : usa
    GRUPO_MODIFICADOR ||--o{ MODIFICADOR : contiene
    COMBO ||--o{ COMBO_ITEM : compone
    PRODUCTO ||--o{ COMBO_ITEM : incluye
    MESA ||--o{ PEDIDO : recibe
    PEDIDO ||--o{ ITEM_PEDIDO : incluye
    ITEM_PEDIDO ||--o{ ITEM_MODIFICADOR : elige
    PEDIDO ||--|| CUENTA : genera
    CUENTA ||--o{ DESCUENTO : aplica
    CUENTA ||--o{ PAGO : recibe
    CUENTA ||--o{ DIVISION : divide
    USUARIO ||--o{ PEDIDO : atiende
    RESTAURANTE ||--o{ AUDITORIA : registra
```

---

## 6. API

### 6.1 Convenciones

| Tema                  | Convención                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| URL base              | `http://localhost:3000` (sin prefijo global)                            |
| Formato               | JSON UTF-8                                                              |
| Autenticación         | `Authorization: Bearer <accessToken>`                                   |
| IDs                   | UUID v4; parámetros inválidos devuelven `400`                           |
| Fechas                | ISO 8601 UTC (`2026-10-27T21:37:21.189Z`)                               |
| Dinero                | Entero en unidad mínima de la moneda; nunca decimales                   |
| Porcentajes           | Puntos base (`10000` = 100 %)                                           |
| Paginación            | `page` (≥ 1, por defecto 1), `limit` (1–100, por defecto 20)            |
| Respuesta paginada    | `{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }` |
| Errores de validación | `400` con `message` como arreglo de mensajes                            |
| Errores de negocio    | `400`, `401`, `403`, `404`, `409`, `429`, `503`                         |
| Rate limit            | Global 120/min; login 5/min; refresh 30/min; forgot 3/min; reset 5/min  |
| Swagger               | `GET /docs` y `GET /docs/json`                                          |

Formato de error típico:

```json
{
  "statusCode": 409,
  "message": "El correo ya está registrado",
  "error": "Conflict"
}
```

Los errores de Prisma añaden `timestamp` y `path`:

```json
{
  "statusCode": 409,
  "message": "Ya existe un registro con esos datos",
  "error": "Conflict",
  "timestamp": "2026-10-27T21:37:21.189Z",
  "path": "/usuarios"
}
```

### 6.2 Endpoints implementados (Fase 1)

| Método   | Ruta                      | Acceso       | Descripción                      |
| -------- | ------------------------- | ------------ | -------------------------------- |
| `GET`    | `/health`                 | Público      | Estado de la API y PostgreSQL    |
| `POST`   | `/auth/login`             | Público      | Inicio de sesión                 |
| `POST`   | `/auth/refresh`           | Público      | Rotación del refresh token       |
| `POST`   | `/auth/logout`            | Público      | Revocación de la sesión          |
| `POST`   | `/auth/forgot-password`   | Público      | Solicitud de recuperación        |
| `POST`   | `/auth/reset-password`    | Público      | Restablecimiento con token       |
| `GET`    | `/auth/me`                | Autenticado  | Perfil actual                    |
| `POST`   | `/auth/change-password`   | Autenticado  | Cambio de contraseña             |
| `POST`   | `/usuarios`               | `ADMIN`      | Crear usuario del restaurante    |
| `GET`    | `/usuarios`               | `ADMIN`      | Listar usuarios con filtros      |
| `GET`    | `/usuarios/:id`           | `ADMIN`      | Obtener usuario                  |
| `PATCH`  | `/usuarios/:id`           | `ADMIN`      | Editar nombre, rol o estado      |
| `DELETE` | `/usuarios/:id`           | `ADMIN`      | Desactivar usuario (soft delete) |
| `POST`   | `/usuarios/:id/reactivar` | `ADMIN`      | Reactivar usuario                |
| `GET`    | `/restaurantes/me`        | `ADMIN`      | Restaurante del usuario          |
| `POST`   | `/restaurantes`           | `SUPERADMIN` | Crear restaurante + primer admin |
| `GET`    | `/restaurantes`           | `SUPERADMIN` | Listar restaurantes              |
| `GET`    | `/restaurantes/:id`       | `SUPERADMIN` | Obtener restaurante              |
| `PATCH`  | `/restaurantes/:id`       | `SUPERADMIN` | Editar restaurante               |

#### `POST /auth/login`

```json
{
  "email": "admin@demo.com",
  "password": "Admin123!"
}
```

Respuesta `200`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "refreshToken": "KvYdz3PPmIRx...",
  "refreshExpiresAt": "2026-11-26T21:37:21.189Z",
  "user": {
    "id": "7d2b9c41-5e3a-4f8b-9c1d-2a6e4f0b8d37",
    "email": "admin@demo.com",
    "fullName": "Administrador Demo",
    "role": "ADMIN",
    "restaurantId": "a53e8757-d1a6-4590-858d-be8a433ddeb4",
    "restaurant": {
      "id": "a53e8757-d1a6-4590-858d-be8a433ddeb4",
      "name": "Restaurante Demo",
      "slug": "demo"
    }
  }
}
```

Errores: `401` credenciales inválidas o usuario inactivo; `403` restaurante inactivo; `429` demasiados intentos.

#### `POST /usuarios`

Requiere rol `ADMIN` y usa el restaurante del token.

```json
{
  "email": "mesero2@demo.com",
  "password": "Mesero123!",
  "fullName": "Mesero Dos",
  "role": "WAITER"
}
```

Respuesta `201`:

```json
{
  "id": "0f1d2c3b-...",
  "email": "mesero2@demo.com",
  "fullName": "Mesero Dos",
  "role": "WAITER",
  "isActive": true,
  "restaurantId": "a53e8757-d1a6-4590-858d-be8a433ddeb4",
  "lastLoginAt": null,
  "createdAt": "2026-10-27T21:40:00.000Z",
  "updatedAt": "2026-10-27T21:40:00.000Z"
}
```

Reglas:

- No se puede crear un `SUPERADMIN`.
- El correo debe ser único globalmente (`409` si existe).
- La contraseña exige 8+ caracteres, mayúscula, minúscula y número.
- Un admin no puede desactivarse ni cambiarse el rol a sí mismo.
- No se puede desactivar al último `ADMIN` activo.

Filtros de `GET /usuarios`: `page`, `limit`, `role`, `isActive`, `search` (nombre o correo).

#### `POST /restaurantes`

Requiere `SUPERADMIN`.

```json
{
  "name": "Restaurante Demo",
  "slug": "demo",
  "currency": "COP",
  "timezone": "America/Bogota",
  "adminEmail": "admin@demo.com",
  "adminPassword": "Admin123!",
  "adminFullName": "Administrador Demo"
}
```

Respuesta `201`: datos del restaurante + `admin` (sin hash). La creación es transaccional.

#### `POST /auth/forgot-password`

Siempre responde `200` con el mismo mensaje para no filtrar la existencia del correo. En desarrollo (`NODE_ENV !== production`) incluye `resetToken` para probar el flujo; en producción debe enviarse por correo.

### 6.3 Endpoints implementados (Fase 2)

| Método             | Ruta                                                  | Rol                    | Descripción                             |
| ------------------ | ----------------------------------------------------- | ---------------------- | --------------------------------------- |
| `GET/POST`         | `/categorias`                                         | `ADMIN` para escritura | Listar (paginado) y crear categorías    |
| `GET/PATCH/DELETE` | `/categorias/:id`                                     | `ADMIN` para escritura | Detalle, edición y baja lógica          |
| `GET/POST`         | `/productos`                                          | `ADMIN` para escritura | Listar con filtros y crear productos    |
| `GET/PATCH/DELETE` | `/productos/:id`                                      | `ADMIN` para escritura | Detalle completo, edición y baja lógica |
| `PATCH`            | `/productos/:id/disponibilidad`                       | `ADMIN`                | Marcar agotado o disponible (RF-15)     |
| `GET/POST`         | `/productos/:id/variantes`                            | `ADMIN` para escritura | Variantes del producto                  |
| `PATCH/DELETE`     | `/productos/:id/variantes/:variantId`                 | `ADMIN`                | Editar o desactivar variante            |
| `POST/DELETE`      | `/productos/:id/grupos-modificadores[/:groupId]`      | `ADMIN`                | Asociar o quitar grupo                  |
| `GET/POST`         | `/grupos-modificadores`                               | `ADMIN` para escritura | Grupos con reglas mínimo/máximo         |
| `GET/PATCH/DELETE` | `/grupos-modificadores/:id`                           | `ADMIN` para escritura | Detalle, edición y baja lógica          |
| `GET/POST`         | `/grupos-modificadores/:id/modificadores`             | `ADMIN` para escritura | Modificadores y costo extra             |
| `PATCH/DELETE`     | `/grupos-modificadores/:id/modificadores/:modifierId` | `ADMIN`                | Editar o desactivar modificador         |
| `GET/POST`         | `/productos/:id/reglas-precio`                        | `ADMIN`                | Precios por franja y días (RF-17)       |
| `PATCH/DELETE`     | `/productos/:id/reglas-precio/:ruleId`                | `ADMIN`                | Editar o desactivar regla               |
| `GET/POST`         | `/productos/:id/disponibilidad`                       | `ADMIN`                | Ventanas de disponibilidad (RF-16)      |
| `DELETE`           | `/productos/:id/disponibilidad/:windowId`             | `ADMIN`                | Desactivar ventana                      |
| `GET/POST`         | `/combos`                                             | `ADMIN` para escritura | Combos y productos incluidos (RF-18)    |
| `GET/PATCH/DELETE` | `/combos/:id`                                         | `ADMIN` para escritura | Detalle, edición y baja lógica          |
| `GET/POST`         | `/cartas`                                             | `ADMIN`                | Versiones de carta (RF-19)              |
| `GET`              | `/cartas/:id`                                         | `ADMIN`                | Versión con snapshot JSON               |
| `POST`             | `/cartas/:id/publicar`                                | `ADMIN`                | Publica y archiva la anterior           |
| `POST`             | `/cartas/:id/duplicar`                                | `ADMIN`                | Duplica una versión como borrador       |
| `GET`              | `/cartas/:id/previsualizar`                           | `ADMIN`                | Previsualiza incluyendo agotados        |
| `GET`              | `/publico/:restauranteSlug/carta`                     | Público                | Carta publicada de solo lectura (RF-20) |

Filtros disponibles: `page`, `limit`, `search`; además `isActive` en todos los
listados, `categoryId`, `preparationArea` e `isAvailable` en productos, y
`published` en versiones de carta.

Contrato real de la carta pública (`GET /publico/demo/carta`, resumido):

```json
{
  "restaurante": {
    "nombre": "Restaurante Demo",
    "slug": "demo",
    "moneda": "COP",
    "zonaHoraria": "America/Bogota"
  },
  "version": {
    "id": "uuid",
    "publicadaEn": "2026-10-27T23:08:56.969Z",
    "estado": "PUBLISHED"
  },
  "categorias": [
    {
      "id": "uuid",
      "nombre": "Entradas",
      "orden": 1,
      "productos": [
        {
          "id": "uuid",
          "nombre": "Nachos",
          "descripcion": "Totopos con queso cheddar y guacamole",
          "precio": 18000,
          "imagen": null,
          "disponible": true,
          "area": "KITCHEN",
          "variantes": [
            { "id": "uuid", "nombre": "Personal", "precio": 18000 },
            { "id": "uuid", "nombre": "Compartir", "precio": 32000 }
          ],
          "gruposModificadores": [
            {
              "id": "uuid",
              "nombre": "Adiciones",
              "obligatorio": false,
              "minimo": 0,
              "maximo": 3,
              "modificadores": [{ "id": "uuid", "nombre": "Queso extra", "precioExtra": 2000 }]
            }
          ]
        }
      ]
    }
  ],
  "combos": [
    {
      "id": "uuid",
      "nombre": "Combo almuerzo",
      "descripcion": "Hamburguesa Comanda + limonada",
      "precio": 35000,
      "imagen": null,
      "items": [
        {
          "productoId": "uuid",
          "producto": "Hamburguesa Comanda",
          "variante": null,
          "cantidad": 1
        }
      ]
    }
  ]
}
```

Criterios de aceptación de la fase — todos verificados:

- CRUD completo con aislamiento por restaurante.
- Disponibilidad inmediata y por horario.
- Precio por periodo aplicado correctamente según día y hora.
- Validación de mínimos/máximos de modificadores.
- Carta pública sin datos internos ni productos inactivos o agotados.
- Pruebas unitarias de precio/disponibilidad y e2e de carta pública.

### 6.4 Endpoints implementados (Fase 3)

| Método             | Ruta                                  | Rol                          | Descripción                                   |
| ------------------ | ------------------------------------- | ---------------------------- | --------------------------------------------- |
| `GET/POST`         | `/zonas`                              | `ADMIN`                      | Listar (paginado) y crear zonas               |
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

`area` acepta `KITCHEN` o `BAR`. Filtros adicionales: `page`, `limit`, `search`
en zonas y mesas, `zoneId` y `status` en mesas, `isActive` en zonas, y `estado`
en pedidos y en la cola por área.

Contrato real para crear un pedido (`POST /pedidos`):

```json
{
  "mesaId": "uuid",
  "comensales": 2,
  "notas": "Cumpleaños",
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

`varianteId` es obligatorio si el producto tiene variantes activas. `cantidad`
va de 1 a 99 por ítem y el pedido admite hasta 100 ítems. La respuesta `201`
incluye los precios congelados (resumida):

```json
{
  "id": "uuid",
  "tableId": "uuid",
  "waiterId": "uuid",
  "status": "OPEN",
  "guests": 2,
  "notes": "Cumpleaños",
  "openedAt": "2026-10-27T23:41:12.000Z",
  "total": 42000,
  "table": {
    "id": "uuid",
    "name": "Mesa 1",
    "capacity": 4,
    "status": "OCCUPIED",
    "zone": { "id": "uuid", "name": "Salón principal" }
  },
  "waiter": { "id": "uuid", "fullName": "Mesero Demo", "email": "mesero@demo.com" },
  "items": [
    {
      "id": "uuid",
      "productNameSnapshot": "Hamburguesa Comanda",
      "variantNameSnapshot": "Doble",
      "quantity": 2,
      "unitPrice": 19000,
      "modifiersTotal": 4000,
      "lineTotal": 42000,
      "notes": "Sin cebolla",
      "preparationArea": "KITCHEN",
      "status": "PENDING",
      "preparationSeconds": null,
      "modifiers": [
        {
          "modifierId": "uuid",
          "nameSnapshot": "Queso extra",
          "extraPrice": 2000,
          "quantity": 1
        }
      ]
    }
  ]
}
```

Abrir mesa usa `POST /mesas/:id/abrir` con
`{ "comensales": 2, "meseroId": "uuid?", "notas": "..." }`; crea un pedido
`OPEN` vacío y deja la mesa `OCCUPIED`. Cambiar de estado usa
`PATCH .../estado` con `{ "estado": "IN_PREPARATION" }`; cancelar usa
`POST .../cancelar` con `{ "motivo": "El cliente cambió de opinión" }` (3 a 300
caracteres). Mover usa `{ "mesaId": "uuid" }` y unir usa
`{ "pedidoDestinoId": "uuid" }`.

Errores de negocio:

- `409` si la mesa no está libre o ya tiene un pedido abierto.
- `403` si el rol no puede aplicar la transición o cancelar el ítem.
- `400` si la transición no es válida, se intenta cancelar por `PATCH` o el
  producto no está disponible.
- `404` si el pedido, la mesa, la zona o el ítem pertenecen a otro restaurante.
- `400` al desactivar una zona que todavía tiene mesas.

Criterios de aceptación de la fase — todos verificados:

- Flujo completo: abrir mesa → pedido → cocina/barra → listo → servido.
- Enrutamiento automático según `preparationArea`.
- Estados válidos y transiciones rechazadas con `400`.
- Cancelación con motivo y auditoría de quién/cuándo.
- Un pedido abierto por mesa (comprobación transaccional + índice único parcial).
- Pruebas de snapshot de precios: cambiar la carta no altera pedidos existentes.
- Aislamiento multi-restaurante verificado en e2e.

### 6.5 Endpoints planificados (fases 4 y 5)

#### Fase 4 — Cuentas

| Método             | Ruta                                    | Rol                          | Descripción                         |
| ------------------ | --------------------------------------- | ---------------------------- | ----------------------------------- |
| `GET`              | `/cuentas/:id`                          | `ADMIN`, `CASHIER`, `WAITER` | Detalle con totales                 |
| `GET`              | `/cuentas?mesaId=`                      | `ADMIN`, `CASHIER`           | Cuenta abierta de una mesa          |
| `POST`             | `/cuentas/:id/descuentos`               | `CASHIER`, `ADMIN`           | Descuento por ítem o cuenta         |
| `POST`             | `/cuentas/:id/propina`                  | `CASHIER`, `ADMIN`           | Aplicar o retirar la propina        |
| `POST`             | `/cuentas/:id/pagos`                    | `CASHIER`                    | Pago total o parcial                |
| `POST`             | `/cuentas/:id/divisiones`               | `CASHIER`                    | División por comensal o ítems       |
| `POST`             | `/cuentas/:id/cerrar`                   | `CASHIER`                    | Cerrar si está totalmente pagada    |
| `POST`             | `/cuentas/:id/anular`                   | `ADMIN`                      | Anular cuenta cerrada con auditoría |
| `GET/PATCH`        | `/restaurantes/me/configuracion-cuenta` | `ADMIN`                      | Configuración de cuentas            |
| `GET/POST`         | `/impuestos`                            | `ADMIN`                      | Listar y crear impuestos            |
| `GET/PATCH/DELETE` | `/impuestos/:id`                        | `ADMIN`                      | Detalle, edición y baja lógica      |

Contrato propuesto de cálculo (`GET /cuentas/:id`):

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
  "lineas": [
    {
      "itemId": "uuid",
      "nombre": "Nachos",
      "cantidad": 2,
      "precioUnitario": 20000,
      "total": 40000,
      "descuento": 0
    }
  ],
  "pagos": [{ "metodo": "CASH", "monto": 20000 }]
}
```

Ejemplo con `pricesIncludeTax = false`, descuento del 10 % y propina del 10 % sobre el total antes de propina (`tipBase = TOTAL`):

```text
subtotal       48 000
descuento       4 800   (10 %)
base gravable  43 200
impuesto 19 %   8 208
propina 10 %    5 141   (10 % de 51 408, redondeado)
total          56 549
```

Criterios de aceptación:

- Motor de cálculo puro, con pruebas escritas **antes** de la implementación.
- Totales correctos con variantes, modificadores, cantidades, descuentos, impuestos y propina.
- Nunca total negativo.
- Cierre solo si `pagado >= total`; la mesa vuelve a `FREE`.
- Pagos parciales y mixtos.
- Descuentos con motivo y aprobación según umbral.
- Anulación con permiso de administrador y auditoría.
- Pruebas de redondeo y de casos límite.

Estado: **implementado** en `src/modules/accounts` y `src/modules/taxes`, con
`test/e2e/accounts.e2e-spec.ts`.

#### Fase 5 — Reportes y auditoría

| Método | Ruta                            | Rol                | Descripción                       |
| ------ | ------------------------------- | ------------------ | --------------------------------- |
| `GET`  | `/reportes/ventas`              | `ADMIN`            | Ventas por día, semana o mes      |
| `GET`  | `/reportes/ventas.csv`          | `ADMIN`            | Exportación CSV del reporte       |
| `GET`  | `/reportes/productos`           | `ADMIN`            | Más/menos vendidos, por categoría |
| `GET`  | `/reportes/meseros`             | `ADMIN`            | Ventas por mesero                 |
| `GET`  | `/reportes/caja`                | `ADMIN`, `CASHIER` | Cierre por turno y método de pago |
| `GET`  | `/reportes/tiempos-preparacion` | `ADMIN`            | Tiempo promedio por área          |
| `GET`  | `/auditoria`                    | `ADMIN`            | Registro con filtros y paginación |

Filtros:

- Comunes a reportes: `desde` y `hasta` (`YYYY-MM-DD` o ISO 8601). Una fecha sin
  hora representa el día completo en la zona horaria del restaurante; sin límites
  se usan los últimos 30 días.
- `/reportes/ventas`: `agrupacion=DIA|SEMANA|MES` (por defecto `DIA`).
- `/reportes/productos`: `categoriaId`, `limite` (1–50) y `orden=DESC|ASC`.
- `/reportes/caja`: `metodoPago=CASH|CARD|TRANSFER`.
- `/reportes/tiempos-preparacion`: `area=KITCHEN|BAR`.
- `/auditoria`: `desde`, `hasta`, `accion`, `entidad`, `entidadId`, `usuarioId`,
  `page` y `limit`.

Reglas de cálculo:

- Solo cuentan cuentas `CLOSED`; las `VOIDED` se excluyen de ventas, productos,
  meseros y caja.
- Ventas agrupadas por `closedAt` con subtotal, descuentos, impuestos, propina,
  total y ticket promedio (total / pedidos, redondeado).
- Productos con la cantidad y el `lineTotal` bruto de ítems no cancelados; la
  categoría se toma del producto actual. Se devuelven `productos`, `masVendidos`,
  `menosVendidos` y `porCategoria`.
- Meseros agrupados por el usuario del pedido, con pedidos, comensales, total y
  ticket promedio.
- Caja agrupada por fecha de pago y método, excluyendo pagos de cuentas anuladas.
- Preparación como `readyAt - startedAt` de ítems no cancelados con ambos tiempos,
  agrupada por área.
- CSV con BOM UTF-8, encabezado, una fila por periodo y una fila `TOTAL`.

Acciones auditadas (RF-70), registradas en la misma transacción del cambio:

| Acción                  | Entidad     | Origen                       |
| ----------------------- | ----------- | ---------------------------- |
| `CANCEL_ITEM`           | `OrderItem` | Cancelación con motivo       |
| `APPLY_DISCOUNT`        | `Discount`  | Descuento por ítem o cuenta  |
| `VOID_ACCOUNT`          | `Account`   | Anulación de cuenta cerrada  |
| `UPDATE_PRODUCT_PRICE`  | `Product`   | Cambio de precio base        |
| `UPDATE_VARIANT_PRICE`  | `Variant`   | Cambio de precio de variante |
| `CREATE_PRICE_RULE`     | `PriceRule` | Alta de regla de precio      |
| `UPDATE_PRICE_RULE`     | `PriceRule` | Cambio de precio de la regla |
| `DEACTIVATE_PRICE_RULE` | `PriceRule` | Baja lógica de la regla      |
| `UPDATE_COMBO_PRICE`    | `Combo`     | Cambio de precio de combo    |

Cada registro guarda `restaurantId`, `userId` (opcional), `action`, `entityType`,
`entityId`, `before`, `after`, `metadata`, `ip`/`userAgent` opcionales y
`createdAt`. La consulta se ordena del más reciente al más antiguo.

Estado: **implementado** en `src/modules/reports`, `src/modules/audit` y
`src/common/utils/date-range.ts`, con `reports-calculator.service.spec.ts`,
`date-range.spec.ts` y `test/e2e/reports.e2e-spec.ts`.

---

## 7. Reglas de negocio y cálculos

### 7.1 Reglas de `REQUERIMIENTOS.md` §4

| #   | Regla                                              | Estado               | Cómo se aplica                                                                                                                      |
| --- | -------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dinero como entero en unidad mínima                | ✅ (carta y pedidos) | `base_price`, `price`, `extra_price`, `combos.price`, `unit_price`, `modifiers_total` y `line_total` son `INTEGER` con `CHECK >= 0` |
| 2   | Orden: subtotal → descuentos → impuestos → propina | ✅ (cuentas)         | `AccountCalculatorService.calculate`; orden verificado con pruebas unitarias y e2e                                                  |
| 3   | Un descuento no deja el total negativo             | ✅ (cuentas)         | Base gravable acotada a `max(0, subtotal - descuentos)` y descuentos acotados por línea/cuenta                                      |
| 4   | Ítem `served` no se cancela sin admin              | ✅ (pedidos)         | `OrderStatusService.assertCanCancel`; `WAITER` recibe `403` si el ítem está `SERVED`                                                |
| 5   | Producto agotado no se agrega a pedidos nuevos     | ✅ (pedidos)         | `OrderItemCalculatorService` valida `isActive`, `isAvailable`, variante y ventana horaria                                           |
| 6   | Precio fijo al momento del pedido                  | ✅ (pedidos)         | Snapshot de nombre, variante, `unit_price`, extras y `line_total` en `order_items`                                                  |
| 7   | Una cuenta abierta por mesa                        | ✅ (cuentas)         | Índice único parcial `accounts_one_open_per_table` además de la comprobación transaccional                                          |
| 8   | No cerrar con pagos insuficientes                  | ✅ (cuentas)         | `AccountsService.close` exige `paidTotal >= total`; si no, `400`                                                                    |
| 9   | Descuentos altos requieren aprobación              | ✅ (cuentas)         | Umbral configurable por restaurante; sobre el umbral solo `ADMIN`, con `approved_by_id`                                             |
| 10  | Nada se borra si tiene movimientos                 | 🟡                   | Soft delete en usuarios, restaurantes, carta y zonas; mesas y pedidos no se borran                                                  |

### 7.2 Reglas adicionales decididas

- **Aislamiento:** toda consulta de negocio incluye `restaurantId` del JWT. Un recurso de otro tenant responde `404` (no `403`) para no revelar su existencia.
- **Superadmin:** no opera dentro de un restaurante; solo crea y administra tenants.
- **Roles:** un usuario tiene un solo rol. El rol `KITCHEN` cubre cocina y barra; el área se distingue por el producto.
- **Soft delete:** desactivar un usuario bloquea login y refresh; el historial se conserva.
- **Contraseñas:** Argon2id; nunca se devuelve el hash.
- **Refresh:** rotación en cada uso; reutilizar un token revoca la familia completa.
- **Reset de contraseña:** invalida todos los refresh tokens del usuario.
- **Rate limiting:** global y reforzado en login/recuperación.
- **Carta y horarios:** `daysOfWeek` es una máscara de bits (bit 0 = lunes) y las horas se guardan como `HH:mm`. El motor recibe el instante ya convertido a la zona horaria del restaurante, de modo que el resultado no depende del reloj del servidor.
- **Precio y disponibilidad de una carta publicada:** el snapshot congela la configuración, pero el precio efectivo y la disponibilidad se calculan al leer, para que un happy hour siga funcionando.
- **Variantes obligatorias:** si un producto tiene al menos una variante activa, no se puede resolver su precio sin elegir una.
- **Carta pública:** no incluye `restaurantId`, `isActive` ni productos agotados. La previsualización autenticada sí los incluye con `disponible: false`.
- **Estados de mesa:** `FREE`, `OCCUPIED` y `TO_CHARGE`. Abrir, crear y mover exigen una mesa `FREE`; unir exige dos pedidos `OPEN`. La primera operación financiera (pago o división) marca la mesa `TO_CHARGE` y el cierre la devuelve a `FREE`.
- **Un pedido abierto por mesa:** además de la comprobación dentro de la transacción, el índice único parcial `orders_one_open_per_table` impide dos pedidos `OPEN` para la misma mesa incluso con concurrencia.
- **Estados del pedido:** `OPEN`, `CLOSED` y `CANCELLED`. El cierre de la cuenta cierra el pedido; un pedido origen de una unión queda `CANCELLED` y su mesa vuelve a `FREE`.
- **Estados del ítem:** `PENDING → IN_PREPARATION → READY → SERVED`, con cancelación desde cualquier estado no cancelado. `CANCELLED` no se aplica por el endpoint de estado: exige `POST .../cancelar` con motivo.
- **Permisos de transición:** `KITCHEN` solo envía a preparación y marca listo; `WAITER` envía a preparación y marca servido; `ADMIN` puede aplicar cualquier transición. Un ítem `SERVED` solo lo cancela un `ADMIN`.
- **Snapshot de ítem:** se congelan `product_name_snapshot`, `variant_name_snapshot`, `unit_price`, los extras de cada modificador y `line_total`. `modifiers_total` es el extra de toda la línea (`extra por unidad × cantidad`), por lo que `line_total = unit_price × quantity + modifiers_total`.
- **Agregar ítems:** solo sobre pedidos `OPEN`; los nuevos ítems nacen en `PENDING` y vuelven a validar disponibilidad y reglas de la carta con el reloj del restaurante.
- **Cola por área:** por defecto devuelve `PENDING`, `IN_PREPARATION` y `READY`, ordenados por `created_at asc`. El filtro `estado` permite acotarla a uno solo.
- **Mover y unir:** mover exige mesa destino libre, libera la origen y conserva el pedido. Unir mueve los ítems al pedido destino, cancela el origen y libera su mesa; ambos deben estar `OPEN`.
- **Zonas:** usan baja lógica (`isActive = false`) y no se pueden desactivar mientras tengan mesas. Las mesas no tienen borrado: se conservan para el historial.
- **Listado de pedidos:** `GET /pedidos` no estaba en la especificación original; se agregó con filtros `mesaId` y `estado` para que el mesero pueda consultar la operación sin conocer los IDs.
- **Códigos de acción:** los `POST` de acción (`/abrir`, `/mover`, `/unir`, `/cancelar`, cuentas) responden `201`, el valor por defecto de Nest para `POST`; las pruebas e2e lo verifican.
- **Cuenta automática:** `POST /pedidos` y `POST /mesas/:id/abrir` crean la cuenta con el pedido. Los totales persistidos se sincronizan al agregar o cancelar ítems, mover la mesa y unir pedidos; el detalle siempre se calcula en vivo.
- **Configuración por restaurante:** `pricesIncludeTax`, `tipEnabled`, `tipSuggestedBps`, `tipBase` y `discountApprovalThresholdBps`, con valores por defecto `false`, `true`, `1000`, `TOTAL` y `2000`. Se editan en `GET/PATCH /restaurantes/me/configuracion-cuenta`.
- **Impuestos:** solo los activos se aplican. Con `pricesIncludeTax = true` se permite un único impuesto activo; el impuesto se extrae del precio y se prorratea entre tasas si hubiera varias.
- **Propina:** se aplica con `POST /cuentas/:id/propina` y se retira con `porcentajeBps = 0`. No se puede aplicar si `tipEnabled = false`. Su base es la configurada (`SUBTOTAL` o `TOTAL`).
- **Descuentos:** por ítem o por cuenta, con `motivo` obligatorio. Se acotan al valor de la línea o de la cuenta. Superar el umbral exige `ADMIN`; el descuento queda con `approvedById`.
- **Pagos:** no superan el saldo de la cuenta ni el saldo de la división indicada. Se admiten métodos `CASH`, `CARD` y `TRANSFER`, parciales y mixtos.
- **Divisiones:** por comensal reparte el total en partes iguales; por ítems exige asignar todos los ítems no cancelados y prorratea el total. Ambas garantizan que la suma sea exacta. Una nueva división reemplaza la anterior.
- **Cierre y anulación:** cerrar exige `pagado >= total`, cierra el pedido y libera la mesa. Solo se anulan cuentas `CLOSED`; se guardan autor, fecha y motivo. Un pedido con pagos o descuentos no se puede unir.
- **Rangos de reportes:** `desde`/`hasta` sin hora representan días completos en la zona del restaurante; las fechas ISO completas se usan tal cual. Sin límites se toman los últimos 30 días y un rango invertido responde `400`.
- **Base de los reportes:** ventas, productos, meseros y caja solo consideran cuentas `CLOSED`; las `VOIDED` se excluyen. Los productos usan el `lineTotal` bruto de ítems no cancelados y la preparación usa `readyAt - startedAt` de ítems con ambos tiempos.
- **Auditoría:** cada acción sensible se registra en la misma transacción que el cambio, con `before`/`after` y usuario. La consulta filtra por fecha, acción, entidad, entidadId y usuario, con paginación y orden descendente por fecha.

### 7.3 Fórmulas implementadas en la Fase 4

Notación:

- `bps`: puntos base (10000 = 100 %).
- `round(x)`: redondeo comercial a entero (mitad hacia arriba).
- `unitPrice`: precio de variante o precio base vigente.
- `modifiersExtra`: suma de extras de modificadores por unidad.
- `qty`: cantidad.

```text
lineTotal        = (unitPrice + modifiersExtra) * qty
subtotal         = Σ lineTotal de ítems no cancelados
itemDiscounts    = Σ descuentos por ítem (acotados al total de la línea)
accountDiscounts = descuentos de cuenta (acotados al subtotal restante)
discounts        = min(subtotal, itemDiscounts + accountDiscounts)
taxableBase      = subtotal - discounts

Si pricesIncludeTax = false:
  tax_i   = round(taxableBase * rateBps_i / 10000)
  taxes   = Σ tax_i
  tipBase = taxableBase                          (si tipBase = SUBTOTAL)
            taxableBase + taxes                  (si tipBase = TOTAL)
  tip     = round(tipBase * tipBps / 10000)
  total   = taxableBase + taxes + tip

Si pricesIncludeTax = true:
  taxes   = round(taxableBase * combinedRateBps / (10000 + combinedRateBps))
  tipBase = taxableBase                          (si tipBase = SUBTOTAL)
  tip     = round(tipBase * tipBps / 10000)
  total   = taxableBase + tip                    -- el impuesto ya está incluido
```

Decisiones aplicadas:

- `tipBase` por defecto `TOTAL`; es configurable por restaurante y la propina se calcula una sola vez sobre la base.
- Con `pricesIncludeTax = true` se permite **un solo impuesto activo**. Si existieran varias tasas, el impuesto se prorratea entre ellas.
- Umbral de aprobación de descuentos: **20 % (2000 bps)** por defecto, configurable por restaurante.
- Redondeo: cada impuesto y la propina se redondean una sola vez al final; el reparto de divisiones e impuestos incluidos usa el método del residuo mayor para que la suma sea exacta.
- El descuento de cuenta se calcula sobre el subtotal restante después de los descuentos por ítem.

---

## 8. Trazabilidad de requerimientos

### 8.1 Requerimientos funcionales

| ID    | Requerimiento                                               | Prioridad | Fase         | Estado |
| ----- | ----------------------------------------------------------- | --------- | ------------ | ------ |
| RF-01 | Login con access y refresh token                            | Alta      | 1            | ✅     |
| RF-02 | Renovación con rotación y revocación                        | Alta      | 1            | ✅     |
| RF-03 | Admin crea/edita/desactiva/reactiva usuarios y asigna roles | Alta      | 1            | ✅     |
| RF-04 | Control de acceso por rol                                   | Alta      | 1            | ✅     |
| RF-05 | Aislamiento por restaurante                                 | Alta      | 1            | ✅     |
| RF-06 | Superadmin crea restaurantes y primer admin                 | Alta      | 1            | ✅     |
| RF-07 | Cambio y recuperación de contraseña                         | Media     | 1            | ✅     |
| RF-10 | CRUD de categorías con orden y estado                       | Alta      | 2            | ✅     |
| RF-11 | CRUD de productos con área de preparación                   | Alta      | 2            | ✅     |
| RF-12 | Variantes por producto con precio                           | Alta      | 2            | ✅     |
| RF-13 | Grupos de modificadores con reglas                          | Alta      | 2            | ✅     |
| RF-14 | Modificadores con costo adicional                           | Alta      | 2            | ✅     |
| RF-15 | Marcar producto agotado/disponible                          | Alta      | 2            | ✅     |
| RF-16 | Disponibilidad por horario                                  | Media     | 2            | ✅     |
| RF-17 | Precios por periodo y días                                  | Media     | 2            | ✅     |
| RF-18 | Combos o menús con precio propio                            | Media     | 2            | ✅     |
| RF-19 | Versiones de carta (borrador/publicada, duplicar)           | Baja      | 2 (opcional) | ✅     |
| RF-20 | Endpoint público de carta publicada                         | Media     | 2            | ✅     |
| RF-30 | CRUD de zonas y mesas                                       | Alta      | 3            | ✅     |
| RF-31 | Estados de mesa                                             | Alta      | 3            | ✅     |
| RF-32 | Abrir mesa con comensales y mesero                          | Alta      | 3            | ✅     |
| RF-33 | Mover pedido y unir cuentas                                 | Baja      | 3.5          | ✅     |
| RF-40 | Crear pedido con ítems completos                            | Alta      | 3            | ✅     |
| RF-41 | Validar reglas de la carta al crear ítem                    | Alta      | 3            | ✅     |
| RF-42 | Guardar precio vigente en el ítem                           | Alta      | 3            | ✅     |
| RF-43 | Agregar ítems a pedido ya enviado                           | Alta      | 3            | ✅     |
| RF-44 | Cancelar ítems con motivo y auditoría                       | Alta      | 3            | ✅     |
| RF-45 | Estados de ítem                                             | Alta      | 3            | ✅     |
| RF-46 | Enrutamiento automático cocina/barra                        | Alta      | 3            | ✅     |
| RF-47 | Vista por área ordenada por antigüedad                      | Alta      | 3            | ✅     |
| RF-48 | Notificación en tiempo real al mesero                       | Baja      | 6            | ⬜     |
| RF-49 | Registro de tiempos de preparación                          | Media     | 3            | ✅     |
| RF-50 | Cálculo de subtotal                                         | Alta      | 4            | ✅     |
| RF-51 | Impuestos configurables por restaurante                     | Alta      | 4            | ✅     |
| RF-52 | Propina configurable y removible                            | Alta      | 4            | ✅     |
| RF-53 | Descuentos por ítem/cuenta con motivo y permiso             | Alta      | 4            | ✅     |
| RF-54 | División de cuenta                                          | Media     | 4            | ✅     |
| RF-55 | Pagos efectivo/tarjeta/transferencia, parciales y mixtos    | Alta      | 4            | ✅     |
| RF-56 | Cierre solo con total pagado                                | Alta      | 4            | ✅     |
| RF-57 | Anulación de cuenta cerrada con auditoría                   | Media     | 4            | ✅     |
| RF-60 | Ventas por día y rango                                      | Alta      | 5            | ✅     |
| RF-61 | Ventas por categoría, producto y mesero                     | Media     | 5            | ✅     |
| RF-62 | Productos más y menos vendidos                              | Media     | 5            | ✅     |
| RF-63 | Ticket promedio y ocupación de mesas                        | Media     | 5            | 🟡     |
| RF-64 | Tiempo promedio de preparación por área                     | Baja      | 5            | ✅     |
| RF-65 | Cierre de caja por turno                                    | Media     | 5            | ✅     |
| RF-66 | Exportación CSV                                             | Baja      | 5            | ✅     |
| RF-70 | Auditoría de acciones sensibles                             | Alta      | 5            | ✅     |
| RF-71 | Consulta de auditoría con filtros                           | Media     | 5            | ✅     |

**Avance funcional:** 47 de 49 requerimientos (96 %): 7 de la Fase 1, los 11
de la Fase 2 (RF-10 a RF-20), los 13 de la Fase 3 (RF-30 a RF-33 y RF-40 a
RF-47, más RF-49), los 8 de la Fase 4 (RF-50 a RF-57) y 8 de la Fase 5
(RF-60 a RF-62, RF-64 a RF-66, RF-70 y RF-71). RF-63 queda parcial: el ticket
promedio está implementado en ventas y meseros, pero la ocupación de mesas no
forma parte del contrato de reportes de esta fase. RF-48 (SSE) corresponde a la
Fase 6.

### 8.2 Criterios de terminado del MVP (§9)

| Criterio                                          | Estado | Nota                                                              |
| ------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Todo se levanta con `docker compose up`           | ✅     | Ejecutado con Docker Desktop 29.9.2: API y PostgreSQL saludables  |
| Flujo completo de punta a punta                   | ✅     | Auth, carta, pedidos, cuentas, reportes y auditoría verificados   |
| Pruebas de cálculos de cuenta                     | ✅     | `account-calculator.service.spec.ts` y `accounts.e2e-spec.ts`     |
| Prueba de aislamiento entre restaurantes          | ✅     | `auth`, `menu`, `orders`, `accounts` y `reports` e2e              |
| OpenAPI publicada y consultable                   | 🟡     | `/docs` activo; faltan esquemas de respuesta completos            |
| README con instalación, arquitectura y decisiones | ✅     | `README.md`                                                       |
| Datos de ejemplo                                  | ✅     | `prisma/seed.ts` con carta, 2 zonas, 5 mesas, IVA y configuración |

---

## 9. Requerimientos no funcionales

### 9.1 Seguridad

| Requisito                             | Estado | Detalle                                                      |
| ------------------------------------- | ------ | ------------------------------------------------------------ |
| Hash de contraseñas (argon2 o bcrypt) | ✅     | Argon2id                                                     |
| Validación y sanitización de entradas | ✅     | `ValidationPipe` estricto + DTOs + Zod para entorno          |
| Rate limiting de login                | ✅     | 5/min por IP; global 120/min                                 |
| CORS por entorno                      | ✅     | `CORS_ORIGINS`                                               |
| Secretos solo en entorno              | ✅     | `.env`, validado al arrancar; `.env` fuera de Git            |
| Consultas parametrizadas              | ✅     | Prisma                                                       |
| Cabeceras de seguridad                | ✅     | Helmet + CSP compatible con Swagger                          |
| Pruebas de aislamiento                | ✅     | 42 pruebas e2e, incluidas carta, catálogo, pedidos y cuentas |
| Bloqueo de cuenta tras N intentos     | ⬜     | Hoy solo rate limit; evaluar en Fase 6                       |
| Limpieza de tokens expirados          | ⬜     | Job programado pendiente                                     |
| HTTPS / proxy inverso                 | ⬜     | Fuera del MVP local; documentar despliegue                   |
| Auditoría de acciones sensibles       | ⬜     | Fase 5                                                       |
| 2FA                                   | ⬜     | Fuera de alcance                                             |

### 9.2 Calidad

| Requisito                                   | Estado | Detalle                                                                                                                                              |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript estricto                         | ✅     | `strict`, `noUncheckedIndexedAccess`                                                                                                                 |
| ESLint y Prettier                           | ✅     | Configuración plana de ESLint 9                                                                                                                      |
| Cobertura ≥ 70 % en lógica de negocio       | ⬜     | Cobertura unitaria actual: **13,76 %**; e2e no instrumentado. `AccountCalculatorService` 93,90 %, `MenuPricingService` 87,23 % y pedidos puros 100 % |
| Cobertura prioritaria en cálculo de cuentas | ✅     | `AccountCalculatorService` 93,90 % de sentencias y 92,85 % de líneas; casos de redondeo, impuestos incluidos y divisiones                            |
| Commits descriptivos y PRs                  | ⬜     | El directorio aún no es un repositorio Git                                                                                                           |
| Pruebas de aislamiento                      | ✅     | Incluidas en e2e                                                                                                                                     |

### 9.3 Rendimiento

| Requisito                                 | Estado | Detalle                                                                                                                                                                |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Respuesta < 300 ms en operaciones comunes | ⬜     | No medido; falta prueba de carga                                                                                                                                       |
| Índices en consultas frecuentes           | 🟡     | Fases 1–3 indexadas; faltan cuentas y reportes                                                                                                                         |
| Paginación en todos los listados          | 🟡     | Zonas, mesas, pedidos, cola por área, categorías, productos, combos, grupos, versiones, usuarios y restaurantes; variantes y ventanas se listan completas por producto |

### 9.4 Despliegue y operación

| Requisito                             | Estado | Detalle                                                                           |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `docker compose up` con API y BD      | ✅     | Validado: imágenes construidas, migraciones y seed ejecutados, `/health` en verde |
| Migraciones versionadas y automáticas | ✅     | `prisma migrate` + entrypoint                                                     |
| `.env.example` documentado            | ✅     | Incluye todas las variables                                                       |
| `/health`                             | ✅     | Comprueba PostgreSQL                                                              |
| Logs estructurados                    | ⬜     | Hoy logs de Nest en texto; planificado para Fase 6                                |
| Seed con restaurante demo             | ✅     | 5 usuarios, carta demo publicada, 2 zonas y 5 mesas                               |

### 9.5 Documentación

| Requisito                                         | Estado | Detalle                                                       |
| ------------------------------------------------- | ------ | ------------------------------------------------------------- |
| OpenAPI (Swagger UI)                              | 🟡     | Disponible; faltan esquemas de respuesta y ejemplos completos |
| README con instalación, arquitectura y decisiones | ✅     | `README.md`                                                   |
| Diagrama de arquitectura y modelo de datos        | 🟡     | Mermaid en README y en este documento                         |
| Documento de estado y especificación detallada    | ✅     | Este archivo                                                  |

### 9.6 Integración continua

| Requisito                                          | Estado | Detalle                                                                                 |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| GitHub Actions: instalación, lint, pruebas y build | 🟡     | `.github/workflows/ci.yml` escrito; no ejecutado porque el directorio no es un repo Git |

---

## 10. Pruebas y calidad

### 10.1 Pruebas existentes

| Archivo                                                    | Tipo     | Qué cubre                                                                                                           |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/modules/auth/password.service.spec.ts`                | Unitaria | Hash, verificación y hash inválido                                                                                  |
| `src/common/guards/roles.guard.spec.ts`                    | Unitaria | Roles permitidos, denegados y sin usuario                                                                           |
| `src/common/dto/pagination.dto.spec.ts`                    | Unitaria | Cálculo de `skip/take` y metadatos                                                                                  |
| `src/modules/catalog/pricing/menu-pricing.service.spec.ts` | Unitaria | Ventanas, cruce de medianoche, zona horaria, disponibilidad, prioridad de precios y reglas de modificadores         |
| `src/modules/orders/order-status.service.spec.ts`          | Unitaria | Transiciones válidas e inválidas y permisos por rol                                                                 |
| `src/modules/orders/order-item-calculator.service.spec.ts` | Unitaria | Snapshot de nombres y precios, variantes, extras por línea, agotado y reglas de modificadores                       |
| `src/modules/accounts/account-calculator.service.spec.ts`  | Unitaria | Descuentos, impuestos incluidos/excluidos, propina, redondeo, casos límite y reparto exacto                         |
| `src/common/utils/date-range.spec.ts`                      | Unitaria | Rangos por zona horaria, días completos, ISO, DST, día/semana/mes                                                   |
| `src/modules/reports/reports-calculator.service.spec.ts`   | Unitaria | Agregaciones de ventas, productos, meseros, caja, tiempos, CSV y casos vacíos                                       |
| `test/e2e/auth.e2e-spec.ts`                                | e2e      | Health, login, refresh, reutilización, logout, reset, creación de tenants, aislamiento, roles y soft delete         |
| `test/e2e/menu.e2e-spec.ts`                                | e2e      | CRUD de carta, variantes, modificadores, combos, reglas de precio, versiones, carta pública, snapshot y aislamiento |
| `test/e2e/orders.e2e-spec.ts`                              | e2e      | Zonas, mesas, apertura, pedido con snapshot, cola por área, estados, cancelación, mover, unir y aislamiento         |
| `test/e2e/accounts.e2e-spec.ts`                            | e2e      | Impuestos, configuración, descuentos, propina, pagos mixtos, divisiones, cierre, anulación y aislamiento            |
| `test/e2e/reports.e2e-spec.ts`                             | e2e      | Ventas, productos, meseros, caja, tiempos, CSV, auditoría, filtros, roles y aislamiento                             |

Resultado actual:

- **83 pruebas unitarias** en 9 archivos.
- **59 pruebas e2e** en 5 archivos.
- **Cobertura unitaria:** 20,47 % de sentencias global; `ReportsCalculatorService`
  98,09 %, `AccountCalculatorService` 93,90 %, `MenuPricingService` 87,23 %,
  utilidades de fecha 93,61 %, `OrderStatusService` y
  `OrderItemCalculatorService` 100 %. Los e2e validan comportamiento pero no se
  incluyen en la métrica.

### 10.2 Estrategia por fase

| Fase | Unitarias                                                                                    | e2e                                                                           |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 2    | ✅ Precio efectivo, disponibilidad por día/hora, reglas de modificadores                     | ✅ CRUD, aislamiento, carta pública, producto agotado, snapshot               |
| 3    | ✅ Transiciones de estado, snapshot de precios, enrutamiento                                 | ✅ Flujo completo mesa → pedido → cocina → servido, cancelación, mover y unir |
| 4    | ✅ Motor de cálculo: descuentos, impuestos incluidos/excluidos, propina, redondeo y división | ✅ Descuento + pagos mixtos + división + cierre + anulación y aislamiento     |
| 5    | ✅ Agregaciones y fechas de reportes                                                         | ✅ Reportes contra fixtures, auditoría, CSV, roles y aislamiento              |
| 6    | —                                                                                            | Carga, SSE, contrato OpenAPI                                                  |

### 10.3 Regla de cobertura

El umbral del 70 % se activará en la Fase 6. La cobertura global actual es
20,47 %, pero los motores puros ya están entre 87 % y 100 % y los e2e cubren los
flujos completos. Activarlo hoy haría fallar el CI por los servicios de
infraestructura y controladores, que se miden pero no se prueban unitariamente.

### 10.4 CI

`.github/workflows/ci.yml` ejecuta:

1. `npm ci`
2. `npx prisma generate`
3. `npx prisma migrate deploy` contra PostgreSQL 18 de servicio
4. `npm run lint`
5. `npm test`
6. `npm run test:e2e`
7. `npm run build`

Pendiente: añadir un job que valide `docker compose config` y el build de la
imagen. El repositorio ya está publicado en GitHub y el workflow se ejecuta en
cada push a `main`.

---

## 11. Operación y despliegue

### 11.1 Docker Compose

Servicios:

- `postgres`: PostgreSQL 18 con volumen persistente y healthcheck.
- `api`: imagen multi-stage; aplica migraciones al arrancar y opcionalmente ejecuta el seed (`RUN_SEED=true`).

```bash
cp .env.example .env
# Ajustar JWT_ACCESS_SECRET
docker compose up --build
```

> **Estado real:** validado con Docker Desktop 29.9.2. `docker compose up -d --build`
> construye la imagen, aplica migraciones, ejecuta el seed y deja `comanda-api` y
> `comanda-postgres` en estado `healthy`. El Dockerfile copia `node_modules` desde
> la etapa de build para incluir el Prisma Client generado.

### 11.2 Desarrollo local

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

La base de desarrollo y la de pruebas (`comanda_test`) viven en el contenedor
`comanda-postgres` publicado en `localhost:5432`:

```bash
docker compose up -d postgres
docker compose exec postgres createdb -U comanda comanda_test  # solo la primera vez
```

Para pruebas e2e en PowerShell:

```powershell
$env:DATABASE_URL='postgresql://comanda:comanda@localhost:5432/comanda_test?schema=public'
npx.cmd prisma migrate deploy
npm.cmd run test:e2e
```

### 11.3 Variables de entorno

| Variable                     | Obligatoria | Por defecto   | Uso                                      |
| ---------------------------- | ----------- | ------------- | ---------------------------------------- |
| `NODE_ENV`                   | No          | `development` | Entorno                                  |
| `PORT`                       | No          | `3000`        | Puerto HTTP                              |
| `DATABASE_URL`               | Sí          | —             | Conexión PostgreSQL                      |
| `JWT_ACCESS_SECRET`          | Sí          | —             | Firma del access token (≥ 32 caracteres) |
| `JWT_ACCESS_TTL_SECONDS`     | No          | `900`         | Vida del access token                    |
| `REFRESH_TOKEN_TTL_DAYS`     | No          | `30`          | Vida del refresh token                   |
| `PASSWORD_RESET_TTL_MINUTES` | No          | `30`          | Vida del token de recuperación           |
| `CORS_ORIGINS`               | No          | `*`           | Orígenes permitidos, separados por comas |
| `THROTTLE_TTL_SECONDS`       | No          | `60`          | Ventana del rate limit                   |
| `THROTTLE_LIMIT`             | No          | `120`         | Peticiones por ventana                   |
| `SEED_*`                     | No          | demo          | Credenciales del seed                    |

### 11.4 Credenciales demo

| Rol        | Correo                   | Contraseña       |
| ---------- | ------------------------ | ---------------- |
| Superadmin | `superadmin@comanda.app` | `Superadmin123!` |
| Admin      | `admin@demo.com`         | `Admin123!`      |
| Mesero     | `mesero@demo.com`        | `Mesero123!`     |
| Cocina     | `cocina@demo.com`        | `Cocina123!`     |
| Cajero     | `cajero@demo.com`        | `Cajero123!`     |

---

## 12. Roadmap detallado

### Fase 2 — Carta (complejidad L) — ✅ completada

1. ✅ Modelo Prisma y migración de categorías, productos, variantes, grupos, modificadores, reglas de precio, ventanas, combos y versiones.
2. ✅ Módulos CRUD con aislamiento por restaurante y validaciones de negocio.
3. ✅ Servicio puro de resolución de precio y disponibilidad (con pruebas unitarias).
4. ✅ Asociación producto ↔ grupos de modificadores y validación de mínimos/máximos.
5. ✅ Endpoint público de carta publicada y previsualización autenticada.
6. ✅ Swagger con ejemplos y pruebas e2e.
7. ✅ Seed ampliado con carta demo.

**Terminado cuando:** se configura una carta, se consulta públicamente, el precio cambia según horario y un producto agotado no se ofrece. → Verificado en `test/e2e/menu.e2e-spec.ts` y en el smoke test de Docker.

### Fase 3 — Mesas y pedidos (complejidad L) — ✅ completada

1. ✅ Modelo de zonas, mesas, pedidos, ítems y modificadores de ítem.
2. ✅ Apertura de mesa y creación de pedido con snapshot de precios.
3. ✅ Validación de disponibilidad y reglas de modificadores al crear ítems.
4. ✅ Transiciones de estado y permisos por rol.
5. ✅ Vista por área ordenada por antigüedad.
6. ✅ Cancelación con motivo y registro de tiempos.
7. ✅ Pruebas unitarias de transiciones y e2e del flujo completo.

**Terminado cuando:** un mesero abre una mesa, toma un pedido, cocina lo prepara, el mesero lo sirve y todo queda trazado. → Verificado en `test/e2e/orders.e2e-spec.ts`.

### Fase 4 — Cuentas (complejidad XL) — ✅ completada

1. ✅ Pruebas del motor de cálculo (tabla de casos y casos límite).
2. ✅ Motor puro con aritmética entera y redondeo explícito.
3. ✅ Modelo de impuestos, cuentas, descuentos, pagos y divisiones.
4. ✅ Endpoints de consulta, descuentos, propina, pagos, divisiones, cierre y anulación.
5. ✅ Índice único parcial de cuenta abierta por mesa.
6. ✅ Auditoría de descuentos y anulaciones.
7. ✅ Pruebas e2e de pagos mixtos, saldo insuficiente y cierre.

**Terminado cuando:** los totales coinciden con los casos de prueba, no se cierra una cuenta con saldo y la mesa vuelve a libre. → Verificado en `test/e2e/accounts.e2e-spec.ts` y en el smoke test de Docker.

### Fase 5 — Reportes y auditoría (complejidad L)

1. ✅ Tabla de auditoría y registro en acciones sensibles.
2. ✅ Consulta de auditoría con filtros.
3. ✅ Consultas agregadas de ventas, productos, meseros y tiempos.
4. ✅ Cierre de caja por turno y método de pago.
5. ✅ Exportación CSV.
6. ✅ Pruebas con fixtures de ventas conocidas.

**Terminado cuando:** los reportes cuadran con las cuentas cerradas y toda acción sensible queda auditada. → Verificado en `test/e2e/reports.e2e-spec.ts` con fixtures de ventas conocidas, cuentas anuladas excluidas y las nueve acciones auditadas.

### Fase 6 — Pulido (complejidad M/L)

1. Elevar cobertura al 70 % y activar umbrales.
2. Completar esquemas de respuesta en Swagger.
3. Logs estructurados (por ejemplo, Pino) y correlación de peticiones.
4. SSE para “ítem listo”.
5. Frontend mínimo opcional (carta pública, cocina, caja).
6. Pruebas de carga y verificación de < 300 ms.
7. Validar `docker compose up` en un entorno limpio. → ✅ ya validado en Fase 2.
8. Inicializar Git, proteger `main`, PRs y ejecutar CI.
9. Revisión final de README, diagramas y decisiones.

---

## 13. Riesgos, deuda técnica y decisiones pendientes

### 13.1 Riesgos

| Riesgo                                            | Impacto | Mitigación                                                                           |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Cálculo de cuentas incorrecto                     | Crítico | Pruebas primero, aritmética entera, revisión de redondeo                             |
| Fuga entre restaurantes                           | Crítico | Filtro centralizado + e2e de aislamiento por fase                                    |
| Alcance de la carta (variantes, horarios, combos) | Alto    | Entregar carta simple primero; ampliar después                                       |
| Docker no validado                                | Bajo    | Validado con Docker Desktop 29.9.2 en Fase 2                                         |
| Cobertura baja                                    | Medio   | Añadir unitarias por fase; umbral al final                                           |
| Dependencia de una sola persona                   | Medio   | Documentación y seed reproducible                                                    |
| Proyecto dentro de OneDrive                       | Medio   | Mover a una ruta local fuera de OneDrive para evitar bloqueos de archivos y lentitud |
| `npm.ps1` bloqueado por Execution Policy          | Bajo    | Usar `npm.cmd` o ajustar la política                                                 |

### 13.2 Deuda técnica

- Cobertura unitaria del 13,76 % (e2e no instrumentado); cuentas 93,90 %, carta 87,23 % y servicios puros de pedidos 100 %.
- Swagger sin esquemas de respuesta completos.
- Logs en texto, sin estructura ni `requestId`.
- Sin repositorio Git ni ejecución real de CI.
- Sin pruebas de carga.
- `package.json#prisma` está deprecado en Prisma 6; migrar a `prisma.config.ts` antes de Prisma 7.
- La imagen Docker copia dependencias de desarrollo; se puede reducir con una etapa de producción.
- Tokens expirados no se purgan periódicamente.
- No hay bloqueo de cuenta tras intentos fallidos (solo rate limit).
- El correo global impide que una persona pertenezca a dos restaurantes.

### 13.3 Decisiones pendientes

| Tema                    | Opciones                                    | Recomendación                                        |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Frontend                | Solo API / React mínimo                     | React mínimo en Fase 6 si hay tiempo                 |
| Base de la propina      | Subtotal / Total con impuestos              | ✅ `TOTAL` por defecto, configurable por restaurante |
| Impuestos incluidos     | Uno o varios                                | ✅ Uno incluido; varios solo excluidos               |
| Umbral de descuento     | 10 %, 20 %, configurable                    | ✅ 20 % por defecto, editable por restaurante        |
| Versiones de carta      | Snapshot JSON / versionado normalizado      | ✅ Snapshot JSON implementado (RF-19)                |
| Reglas de combos        | Productos fijos / elección dentro de grupos | Empezar con productos fijos                          |
| Tiempo real             | SSE / WebSocket                             | SSE                                                  |
| Pasarela de pagos       | Fuera del MVP                               | Fase posterior                                       |
| Facturación electrónica | Fuera del MVP                               | Fase posterior                                       |
| Multi-moneda            | Una moneda por restaurante                  | Mantener `currency` por restaurante                  |

---

## 14. Guía rápida de ejecución

```bash
# Instalación
npm install

# Entorno
cp .env.example .env
# Editar DATABASE_URL y JWT_ACCESS_SECRET

# Base de datos
npx prisma migrate dev
npm run db:seed

# Desarrollo
npm run start:dev

# Calidad
npm run typecheck
npm run lint
npm test
npm run test:e2e   # requiere DATABASE_URL con "test" en el nombre
npm run build
```

Con Docker:

```bash
docker compose up --build
```

URLs:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs/json>
- Health: <http://localhost:3000/health>
- Carta demo: <http://localhost:3000/publico/demo/carta> (requiere `RUN_SEED=true`)

---

## 15. Changelog

### 2026-10-28 — Fase 5 completada

- Migración `20261028003541_reports_audit`: tabla `audit_logs` con `JSONB`,
  relaciones y índices por fecha, entidad y acción; índices de apoyo para reportes
  en `accounts`, `payments` y `order_items`.
- Módulo `reports`: ventas por día/semana/mes, productos y categorías, meseros,
  caja por método de pago, tiempos de preparación y exportación CSV.
- Módulo `audit`: registro transaccional y consulta con filtros por fecha, acción,
  entidad, entidadId y usuario, con paginación.
- `ReportsCalculatorService`: agregaciones puras y CSV con BOM y fila `TOTAL`.
- `date-range`: resolución de rangos por zona horaria, días completos, ISO y
  agrupación por día/semana/mes.
- Auditoría integrada en cancelación de ítems, descuentos, anulación de cuentas,
  precios de producto/variante, reglas de precio y combos.
- 21 pruebas unitarias nuevas (83 en total) y 17 e2e nuevas (59 en total).
- README y este documento actualizados.

### 2026-10-28 — Fase 4 completada

- Migración `20261028000706_accounts`: impuestos, cuentas, descuentos, pagos,
  divisiones e ítems de división, más la configuración de cuentas en
  `restaurants`.
- Migración `20261028001000_account_constraints`: `CHECK` de importes y
  porcentajes e índice único parcial `accounts_one_open_per_table`.
- Módulo `accounts`: creación automática de la cuenta, sincronización de totales,
  detalle, descuentos, propina, pagos, divisiones, cierre y anulación.
- `AccountCalculatorService`: motor puro con orden subtotal → descuentos →
  impuestos → propina, impuestos incluidos/excluidos y reparto exacto.
- Módulo `taxes`: CRUD de impuestos por restaurante y validación de impuesto
  único cuando los precios lo incluyen.
- Endpoints de configuración de cuentas en `GET/PATCH /restaurantes/me/configuracion-cuenta`.
- Integración con pedidos: cuenta automática, sincronización al agregar/cancelar
  ítems, mover mesa y unir pedidos.
- Seed ampliado con IVA 19 %, propina sugerida del 10 % y umbral de descuento del
  20 %.
- 11 pruebas unitarias nuevas (62 en total) y 8 e2e nuevas (42 en total).
- README y este documento actualizados.

### 2026-10-27 — Fase 3 completada

- Migración `20261027234153_orders`: zonas, mesas, pedidos, ítems y
  modificadores de ítem, con `CHECK`, índices y el índice único parcial
  `orders_one_open_per_table`.
- Módulo `orders`: CRUD de zonas y mesas, apertura de mesa, pedidos con ítems,
  adición de ítems, cambios de estado, cancelación, movimiento y unión.
- `OrderItemCalculatorService`: snapshot de nombres y precios, variante
  obligatoria, disponibilidad, ventana horaria y reglas de modificadores.
- `OrderStatusService`: transiciones y permisos por rol, incluido el bloqueo de
  cancelación de ítems `SERVED` para meseros.
- Cola por área `GET /areas/:area/items-pendientes` ordenada por antigüedad y
  enrutamiento automático a cocina o barra.
- Seed ampliado con 2 zonas y 5 mesas demo.
- 21 pruebas unitarias nuevas (51 en total) y 13 e2e nuevas (34 en total).
- README y este documento actualizados.

### 2026-10-27 — Fase 2 completada

- Migración `20261027230244_menu`: categorías, productos, variantes, grupos y
  modificadores, reglas de precio, ventanas de disponibilidad, combos, ítems de
  combo y versiones de carta, con `CHECK` e índice único parcial.
- Módulos `catalog`, `modifiers` y `menu` con CRUD aislado por restaurante y
  soft delete.
- `MenuPricingService`: motor puro de precio efectivo, disponibilidad por
  franjas con cruce de medianoche y validación de modificadores.
- Versiones de carta con snapshot JSON, publicación, duplicado y previsualización.
- Carta pública `GET /publico/:slug/carta` sin datos internos.
- Seed ampliado con 6 productos, 3 grupos de modificadores, 1 combo y una carta
  demo publicada.
- 20 pruebas unitarias nuevas (30 en total) y 9 e2e nuevas (21 en total).
- Dockerfile corregido para copiar el Prisma Client generado; Docker Compose
  validado de punta a punta con smoke test de `/health`, carta pública, login y
  `/docs`.
- README y este documento actualizados.

### 2026-10-27 — Fase 1 completada

- Scaffold NestJS 11 + Prisma 6 + PostgreSQL 18 + Vitest.
- Migración inicial: restaurantes, usuarios, refresh tokens y tokens de recuperación.
- Autenticación completa con Argon2id, JWT y refresh rotativo con detección de reutilización.
- Roles y guards globales.
- CRUD de usuarios con soft delete y protecciones.
- Alta de restaurantes por superadmin.
- Seed, Docker Compose, Dockerfile, CI, README y este documento.
- 10 pruebas unitarias y 12 e2e en verde.
- Verificación manual de `/health`, login, `/auth/me` y Swagger.
