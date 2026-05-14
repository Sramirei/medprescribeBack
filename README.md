# MedPrescribe API

Backend para sistema de prescripciones médicas. NestJS + Prisma + PostgreSQL.

## Stack

- **NestJS** — framework modular
- **Prisma ORM** — acceso a base de datos
- **PostgreSQL** — base de datos
- **JWT** — access token (15m) + refresh token (7d) con rotación
- **RBAC** — `admin`, `doctor`, `patient` con guards y decorators
- **PDFKit** — generación de PDFs
- **Swagger** — documentación en `/docs`
- **Docker Compose** — entorno local completo

---

## Levantar en 5 minutos

### Opción 1: Docker Compose (recomendado)

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar todo (API + PostgreSQL)
docker compose up --build

# 3. En otra terminal, correr migraciones y seed
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npm run prisma:seed
```

API en `http://localhost:3000/api/v1`
Swagger en `http://localhost:3000/docs`

---

### Opción 2: Local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar DATABASE_URL con tu Postgres local

# 3. Generar Prisma client
npx prisma generate

# 4. Migraciones
npx prisma migrate dev --name init

# 5. Seed
npm run prisma:seed

# 6. Levantar
npm run start:dev
```

---

## Usuarios de prueba (seed)

| Role    | Email              | Password   |
|---------|--------------------|------------|
| admin   | admin@test.com     | admin123   |
| doctor  | dr@test.com        | dr123      |
| patient | patient@test.com   | patient123 |

---

## Endpoints principales

### Auth
```
POST   /api/v1/auth/login       → { accessToken, refreshToken, user }
POST   /api/v1/auth/refresh     → { accessToken, refreshToken }
POST   /api/v1/auth/logout
GET    /api/v1/auth/profile
```

### Prescriptions
```
POST   /api/v1/prescriptions              (doctor)
GET    /api/v1/prescriptions              (all roles, filtrado por rol)
GET    /api/v1/prescriptions/:id          (all roles)
PUT    /api/v1/prescriptions/:id/consume  (patient, admin)
GET    /api/v1/prescriptions/:id/pdf      (all roles)
```

Query params: `?page=1&limit=10&order=desc&status=pending&from=2024-01-01&to=2024-12-31`

### Admin
```
GET    /api/v1/admin/metrics    (admin only)
```

### Users / Doctors / Patients
```
GET/POST/PATCH/DELETE  /api/v1/users      (admin)
GET/PATCH              /api/v1/doctors    (admin, doctor, patient)
GET/PATCH              /api/v1/patients   (admin, doctor, patient)
```

---

## Tests

```bash
# Unitarios
npm test

# Con coverage
npm run test:cov

# E2E (requiere DB corriendo)
npm run test:e2e
```

---

## Estructura del proyecto

```
src/
├── admin/                  # Módulo admin (métricas)
│   ├── admin.controller.ts
│   ├── admin.module.ts
│   └── admin.service.ts
├── auth/                   # Autenticación JWT
│   ├── dto/
│   ├── guards/
│   ├── interfaces/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── common/                 # Compartido entre módulos
│   ├── decorators/         # @CurrentUser, @Roles
│   ├── dto/                # PaginationDto
│   ├── filters/            # HttpExceptionFilter
│   ├── guards/             # RolesGuard
│   └── utils/              # paginate(), getPaginationParams()
├── config/                 # app.config, jwt.config
├── doctors/                # Módulo doctores
├── patients/               # Módulo pacientes
├── prescriptions/          # Módulo prescripciones
│   ├── dto/
│   ├── pdf/                # PrescriptionPdfService (PDFKit)
│   └── utils/
├── prisma/                 # PrismaService (global)
├── users/                  # Módulo usuarios
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma           # Modelos de BD
└── seed.ts                 # Datos iniciales
test/
├── auth.e2e-spec.ts
└── prescriptions.e2e-spec.ts
```

---

## Decisiones técnicas

- **PrismaModule como Global** → evita reimportar en cada módulo
- **JwtStrategy valida en DB** → permite invalidar tokens si el user es borrado
- **Refresh token hasheado** → se guarda el hash en DB, nunca el token en claro
- **RolesGuard + JwtAuthGuard** → RBAC desacoplado del guard de autenticación
- **ResponseInterceptor** → respuestas consistentes `{ data, timestamp }`
- **HttpExceptionFilter** → errores consistentes `{ message, code, details }`
- **buildWhereClause por rol** → el service filtra automáticamente según JWT, sin pasar filtros manuales por controller
