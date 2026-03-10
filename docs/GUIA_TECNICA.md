# Guía Técnica — Tiendario

Arquitectura, decisiones de diseño y flujos críticos del sistema.

---

## 1. Arquitectura General

Tiendario sigue una arquitectura **Cliente-Servidor desacoplada**:

- **Backend**: API REST stateless en Spring Boot. Emite y valida JWT.
- **Frontend Admin**: SPA React para managers — inventario, POS, compras, reportes.
- **Frontend Market**: SPA React para clientes — marketplace, carrito, pedidos.
- **PostgreSQL**: Persistencia relacional (usuarios, ventas, inventario, suscripciones).
- **Elasticsearch**: Búsqueda full-text de productos en el marketplace (opcional, degradable).

---

## 2. Backend (Spring Boot)

### Estructura de paquetes
```
com.tiendario/
├── domain/         # Entidades JPA (@Entity)
├── repository/     # Spring Data JPA + Search repos
├── service/        # Lógica de negocio
├── web/            # Controladores REST (@RestController)
├── payload/        # DTOs de request/response
├── security/       # JWT filter, UserDetailsService
└── config/         # CORS, Security, Elasticsearch config
```

### Seguridad
- **JWT**: El token incluye `companyId`, `subscriptionStatus` y `roles` para evitar queries extra por request.
- **Roles**: `ROLE_ADMIN` (superadmin global), `ROLE_MANAGER` (dueño de tienda), `ROLE_USER` (cliente marketplace).
- **Autorización**: `@PreAuthorize("hasRole('ADMIN')")` en endpoints de superadmin. Validación de `companyId` en todos los endpoints de datos para prevenir acceso cross-tenant.

### Identificación de Productos
- **SKU**: Generado automáticamente por el sistema (formato `CAT-PROD-XXXX`). No editable.
- **Barcode**: Campo opcional (`barcode`) para códigos de fabricante (EAN-13, UPC, etc.). Indexado en DB. El endpoint `GET /api/products/by-barcode/{barcode}` busca primero por barcode y hace fallback a SKU.

### Controladores principales
| Controller | Ruta base | Descripción |
|---|---|---|
| `AuthController` | `/api/auth` | Registro, login, verificación de email |
| `ProductController` | `/api/products` | CRUD de productos + búsqueda por barcode |
| `SaleController` | `/api/sales` | Registro de ventas y POS |
| `PurchaseController` | `/api/purchases` | Órdenes de compra a proveedores |
| `InventoryController` | `/api/inventory` | Ajustes de stock |
| `DashboardController` | `/api/dashboard` | KPIs y métricas |
| `SuperAdminController` | `/api/superadmin` | Gestión global de tenants y usuarios |
| `PublicController` | `/api/public` | Marketplace (sin auth) |
| `CompanyController` | `/api/company` | Configuración de empresa |

---

## 3. Frontend Admin

### Stack
- React 19 · Vite · Bootstrap 5 · React Icons · Axios

### Estructura
```
src/
├── components/
│   ├── Sidebar.jsx       # Navegación lateral dinámica por rol
│   ├── Layout.jsx        # Wrapper con Sidebar + main content
│   └── RequireRole.jsx   # Route guard de autenticación y roles
├── pages/                # Una página por ruta
├── services/             # Axios wrappers hacia la API
└── App.jsx               # Router con rutas protegidas
```

### Protección de Rutas (`RequireRole`)
```
/ (landing)          → Público
/dashboard, /pos, /inventory, etc. → Requiere token JWT válido
/admin/*             → Requiere ROLE_ADMIN
```
Si el token está ausente o expirado → redirige a `/` (landing con login modal).
Si el rol no alcanza → redirige a `/dashboard`.

### Servicios
Cada módulo tiene su service (`product.service.js`, `sale.service.js`, etc.) que:
1. Lee el token de `localStorage` o `sessionStorage`
2. Lo incluye en el header `Authorization: Bearer <token>`
3. Llama a la API con Axios

### POS — Lector de Barras
El `POSPage` tiene un panel de escaneo de alta prioridad:
- Campo de texto monoespaciado con auto-focus al cargar la página
- Detecta entrada rápida (típica de scanner hardware) o Enter manual
- Llama a `productService.findByBarcode(code)` → backend busca por barcode o SKU
- Si encontrado → agrega al carrito automáticamente con feedback visual verde
- Si no encontrado → feedback visual rojo con mensaje

---

## 4. Frontend Market

### Stack
- React 19 · Vite · CSS Modules

### Rutas
```
/           → Marketplace (catálogo público)
/dashboard  → Dashboard de cliente (requiere sesión de cliente)
/terms      → Términos de servicio
/privacy    → Política de privacidad
```

---

## 5. Sistema de Suscripciones

### Estados
| Estado | Restricciones |
|---|---|
| `FREE` | Máx. 10 productos. Sin POS. Sin ventas. Solo exhibición en marketplace. |
| `TRIAL` | 7 días con acceso completo. |
| `PAID` | Sin restricciones. Pedidos en marketplace activos. |
| `PAST_DUE` | Solo lectura. Backend retorna 403 en endpoints de escritura. |
| `SUSPENDED` | Bloqueo total. Sin acceso. |

### Flujo de bloqueo
1. Al login, el JWT incluye `subscriptionStatus`.
2. El frontend deshabilita botones/acciones según el estado.
3. El backend valida independientemente — no confía en el frontend.

---

## 6. Elasticsearch

Elasticsearch es **opcional y degradable**:
- Si no está disponible, el backend continúa sin errores (los logs muestran warnings via SLF4J).
- `ProductIndexService` maneja toda la interacción y captura excepciones.
- El marketplace hace fallback a búsqueda en PostgreSQL si Elasticsearch falla.

---

## 7. PWA (Admin Panel)

El panel admin es una PWA instalable:
- `vite-plugin-pwa` genera el `manifest.webmanifest` y el Service Worker.
- Cachea assets estáticos para carga offline.
- Instalable en escritorio y móvil desde navegadores modernos.

---

## 8. Próximos Pasos Técnicos

- [ ] Integración real con Stripe / MercadoPago (actualmente confirmación manual)
- [ ] Google OAuth2 para login social
- [ ] CI/CD con GitHub Actions
- [ ] Dockerfile + Nginx para producción
- [ ] Backup automático de PostgreSQL
