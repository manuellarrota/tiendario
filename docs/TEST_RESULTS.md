# Plan de Pruebas: Tiendario V1.0.0

Este plan detalla las pruebas funcionales y visuales para validar la primera versión del sistema.

## 🟢 Fase 1: Marketplace (Experiencia del Cliente)
- [ ] **MP-01: Carga de Home**: Verificar diseño premium, presencia de Hero y categorías.
- [ ] **MP-02: Búsqueda Global**: Buscar "Arroz" y confirmar que aparecen resultados relevantes de múltiples tiendas.
- [ ] **MP-03: Detalle de Producto**: Abrir el modal de detalle y verificar info (Precio, Stock, Tienda).
- [ ] **MP-04: Flujo de Compra (PAID)**: Completar una compra en una tienda Premium y ver mensaje de éxito.
- [ ] **MP-05: Restricción de Compra (FREE)**: Verificar que productos de tiendas Free tienen el botón bloqueado.
- [ ] **MP-06: Registro de Cliente**: Registrar un nuevo cliente y verificar redirección al dashboard.

## 🟢 Fase 2: Panel Administrativo (Gestión de Tienda)
- [ ] **AD-01: Login**: Acceder con `demo_user_866` / `password123`.
- [ ] **AD-02: Dashboard & Stats**: Verificar que los KPIs (Total ventas, productos) se cargan.
- [ ] **AD-03: Notificaciones**: Verificar que llegó la notificación de la compra realizada en MP-04.
- [ ] **AD-04: Gestión de Inventario**: Crear un producto nuevo y verificar que aparezca en el Marketplace.
- [ ] **AD-05: Punto de Venta (POS)**: Realizar una venta física y confirmar descuento de stock.
- [ ] **AD-06: Mi Empresa**: Cambiar entre plan FREE y PAID y verificar reflejo en el Marketplace.

## 🟢 Fase 3: Integración y Datos
- [ ] **INT-01: Sincronización de Stock**: Validar que una venta en MP descuenta stock visible en Admin.
- [ ] **INT-02: Reportes**: Verificar que la venta del Marketplace aparece en el historial de transacciones admin.
