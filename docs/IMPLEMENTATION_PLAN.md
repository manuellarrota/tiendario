# Plan de Implementación — Tiendario

Estado actual del desarrollo y hoja de ruta.

_Última actualización: 2026-03-10_

---

## Estado General

✅ **Funcionalidad Core completa y verificada en entorno local.**
🔜 **Pendiente: Despliegue en producción e integraciones externas.**

---

## Funcionalidades Completadas ✅

### Infraestructura
- [x] Monorepo: `backend/`, `frontend/admin/`, `frontend/market/`
- [x] Docker Compose (PostgreSQL + Elasticsearch)
- [x] Spring Boot con Spring Security + JWT multitenancy
- [x] Persistencia JPA/Hibernate con PostgreSQL
- [x] Elasticsearch opcional y degradable (con fallback)
- [x] PWA: Admin panel instalable con Service Worker

### Autenticación y Seguridad
- [x] Registro con verificación de email
- [x] Login JWT con soporte `rememberMe` (localStorage vs sessionStorage)
- [x] Roles: `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_USER`
- [x] Route guards frontend (`RequireRole`) — rutas autenticadas y por rol
- [x] Validaciones server-side: cantidades, precios, tipos de archivo
- [x] Protección cross-tenant: cada empresa solo ve sus datos

### Panel Admin (Managers)
- [x] Inventario: CRUD de productos con paginación, filtros y búsqueda
- [x] SKU autogenerado por sistema (no editable)
- [x] **Barcode**: Campo opcional para código de fabricante (EAN-13, UPC)
- [x] Variantes de producto (Color, Talla, etc.)
- [x] Subida de imágenes de productos
- [x] Categorías: globales del sistema + personalizadas por tienda
- [x] **Punto de Venta (POS)**: lector de barras, búsqueda, carrito, checkout
- [x] **Comprar Mercancía**: órdenes de compra con actualización automática de stock
- [x] Historial de Ventas y Compras con filtros
- [x] Gestión de Proveedores
- [x] Gestión de Clientes con acumulación de puntos de lealtad
- [x] Dashboard de KPIs: ventas, ingresos, stock bajo, top productos
- [x] Control de Caja: cierre diario
- [x] Notificaciones internas (stock bajo, nuevos pedidos)
- [x] Ajustes de Tienda: nombre, dirección, ubicación geográfica, logo
- [x] Suscripciones: pago manual con comprobante + aprobación del SuperAdmin

### Marketplace (Clientes)
- [x] Catálogo público sincronizado con inventarios de tiendas
- [x] Búsqueda full-text con Elasticsearch (fallback a PostgreSQL)
- [x] Filtros por categoría, precio y tienda
- [x] Carrito persistente por tienda
- [x] Sistema de pedidos (Click & Collect)
- [x] Dashboard de cliente: historial de pedidos y puntos
- [x] Geolocalización: mapa de tiendas (Google Maps iframe)
- [x] Modal de login embebido (sin página de login separada)
- [x] Términos de Servicio y Política de Privacidad

### Super Admin (Plataforma)
- [x] Dashboard global: métricas de la plataforma
- [x] Gestión de Empresas: activar/desactivar/cambiar plan
- [x] Validación de pagos de suscripción (aprobación/rechazo)
- [x] Gestión de Usuarios: activar/desactivar cuentas globalmente
- [x] Catálogo Global de productos
- [x] Sugerencias de Categorías: flujo de aprobación
- [x] Configuración de Plataforma: planes, límites, modo mantenimiento
- [x] Onboarding guiado para nuevas tiendas

### Modelo de Suscripción
- [x] Estados: `FREE`, `TRIAL`, `PAID`, `PAST_DUE`, `SUSPENDED`
- [x] Restricciones automáticas en frontend y backend por estado
- [x] Simulación de pago en desarrollo
- [x] Multi-moneda: moneda primaria y secundaria configurables

---

## Pendiente 🔜

### Despliegue en Producción
- [ ] Dockerfile para backend y frontends
- [ ] Nginx como reverse proxy
- [ ] Dominio y certificado SSL (HTTPS)
- [ ] Variables de entorno en producción (sin hardcoding)

### Integraciones Externas
- [ ] Servidor SMTP real para emails transaccionales
- [ ] Stripe / MercadoPago para pagos online (actualmente confirmación manual)
- [ ] Google OAuth2 para login social

### DevOps
- [ ] Pipeline CI/CD con GitHub Actions
- [ ] Backup automático de PostgreSQL
- [ ] Monitoreo de logs y health checks

### Futuras Funcionalidades
- [ ] Módulo de Delivery con rastreo de pedidos
- [ ] App móvil (React Native)
- [ ] Integración con lectores de barras físicos vía Bluetooth

---

## Reglas del Marketplace

| Plan | Puede ver catálogo | Puede comprar | Marketplace activo |
|---|---|---|---|
| `FREE` | ✅ | ❌ | ❌ (solo exhibición) |
| `TRIAL` | ✅ | ✅ | ✅ |
| `PAID` | ✅ | ✅ | ✅ |
| `PAST_DUE` | ✅ | ❌ | ❌ |
| `SUSPENDED` | ❌ | ❌ | ❌ |
