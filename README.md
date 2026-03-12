# Tiendario

**SaaS de Gestión de Inventario, Punto de Venta y Marketplace para Comercios Locales**

Tiendario combina un **Panel Administrativo** completo (inventario, POS, compras, reportes) con un **Marketplace Público** sincronizado en tiempo real, bajo un modelo de suscripción multitenancy.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Java 11 · Spring Boot 2.7 · Spring Security · JWT |
| Base de datos | PostgreSQL (relacional) · Elasticsearch (búsqueda full-text) |
| Frontend Admin | React 19 · Bootstrap 5 · Vite · PWA |
| Frontend Market | React 19 · CSS Modules · Vite |
| Seguridad | JWT · BCrypt · Route Guards (frontend) · @PreAuthorize (backend) |

---

## Arquitectura

```
tiendario/
├── backend/                        # API REST (Spring Boot + Maven)
│   └── src/main/java/com/tiendario/
│       ├── domain/                 # Entidades JPA
│       ├── repository/             # Spring Data JPA + Elasticsearch
│       ├── service/                # Lógica de negocio
│       ├── web/                    # Controladores REST
│       ├── security/               # JWT + Spring Security
│       └── config/                 # Configuración global
├── frontend/
│   ├── admin/                      # Panel de gestión (puerto 8081)
│   └── market/                     # Marketplace público (puerto 8082)
├── docs/                           # Documentación técnica y funcional
├── .agent/workflows/               # Workflows de desarrollo
├── docker-compose.yml              # PostgreSQL + Elasticsearch
└── README.md
```

---

## Puertos de Desarrollo

| Servicio | Puerto | URL |
|---|---|---|
| Backend API | 8080 | http://localhost:8080 |
| Frontend Admin | 8081 | http://localhost:8081 |
| Frontend Market | 8082 | http://localhost:8082 |
| PostgreSQL | 5432 | (interno) |
| Elasticsearch | 9200 | http://localhost:9200 |

---

## Cómo Levantar el Entorno

### Requisitos
- Java 11+ (JDK)
- Node.js 18+
- Docker (para PostgreSQL + Elasticsearch)

### 1. Base de datos (Docker)
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
.\mvnw.cmd spring-boot:run
```

### 3. Frontend Admin
```bash
cd frontend/admin
npm install
npm run dev
```

### 4. Frontend Market
```bash
cd frontend/market
npm install
npm run dev
```

> **Tip:** Ver el workflow completo en [`.agent/workflows/start-dev.md`](.agent/workflows/start-dev.md)

---

## Credenciales de Prueba (Entorno Local)

| Rol | Usuario | Contraseña | Panel |
|---|---|---|---|
| **Super Admin** | `admin` | `Admin123!` | [Admin](http://localhost:8081) |
| **Manager (PAID)** | `manager_pro` | `Manager123!` | [Admin](http://localhost:8081) |
| **Manager (FREE)** | `manager_free` | `Manager123!` | [Admin](http://localhost:8081) |
| **Cliente** | `cliente` | `Cliente123!` | [Market](http://localhost:8082) |

> **Nota:** Las cuentas nuevas registradas desde el formulario quedan **inactivas** hasta que el Super Admin las apruebe, o se valide el link en `backend/verification_links.txt`.

---

## Funcionalidades Principales

### Panel Admin (Managers)
- **Inventario**: CRUD de productos con SKU autogenerado, barcode, variantes, imágenes y categorías
- **Punto de Venta (POS)**: Lector de código de barras integrado, búsqueda por nombre/SKU/barcode, carrito y checkout
- **Comprar Mercancía**: Registro de órdenes de compra a proveedores con actualización automática de stock
- **Historial de Ventas y Compras**: Trazabilidad completa de movimientos
- **Clientes**: Gestión de clientes y acumulación de puntos de lealtad
- **Reportes**: KPIs financieros y dashboard de métricas
- **Control de Caja**: Cierre diario con cuadre de efectivo
- **Notificaciones**: Centro de alertas internas (stock bajo, nuevos pedidos)
- **Ajustes de Tienda**: Configuración de empresa, ubicación y suscripción

### Marketplace (Clientes)
- Catálogo global de productos sincronizado desde los inventarios de las tiendas
- Búsqueda full-text con Elasticsearch
- Carrito y sistema de pedidos (Click & Collect)
- Dashboard de cliente: historial de pedidos y puntos acumulados
- Búsqueda de tiendas por geolocalización

### Super Admin (Plataforma)
- Gestión de empresas: activar/desactivar/cambiar plan
- Validación manual de pagos de suscripción
- Gestión global de usuarios
- Configuración de planes, límites y modo mantenimiento
- Catálogo global y sugerencias de categorías

---

## Modelo de Suscripción

| Estado | Descripción |
|---|---|
| `FREE` | Hasta 10 productos. Sin ventas ni POS. Solo exhibición en marketplace. |
| `TRIAL` | 30 días con funcionalidad completa. |
| `PAID` | Acceso ilimitado. Marketplace activo para pedidos. |
| `PAST_DUE` | Pago vencido. Solo lectura. Bloqueo de creación. |
| `SUSPENDED` | Bloqueo total por el administrador. |

---

## Seguridad

- **Backend**: Todos los endpoints protegidos con JWT. Roles `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_USER` aplicados con `@PreAuthorize`.
- **Frontend**: Route guards (`RequireRole`) protegen todas las rutas autenticadas. Las rutas `/admin/*` requieren `ROLE_ADMIN`.
- **Validaciones**: Cantidades, precios y tipos de archivo validados server-side.

---

## Documentación

| Documento | Descripción |
|---|---|
| [`docs/GUIA_TECNICA.md`](docs/GUIA_TECNICA.md) | Arquitectura, decisiones de diseño y flujos críticos |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Guía de despliegue en producción (AWS) |
| [`docs/DOCUMENTO_FUNCIONAL.md`](docs/DOCUMENTO_FUNCIONAL.md) | Especificación funcional del sistema |
| [`docs/PLAN_DE_PRUEBAS_E2E.md`](docs/PLAN_DE_PRUEBAS_E2E.md) | Plan de pruebas end-to-end |
