# 📄 Documento Funcional: Proyecto Tiendario

Tiendario es una plataforma **SaaS (Software as a Service)** diseñada para modernizar y digitalizar el comercio local. El sistema permite a los dueños de negocios gestionar su operatividad interna mientras exponen sus productos de forma sincronizada en un marketplace global.

---

## 1. Módulos del Sistema

### 1. Registro y Autenticación
- **Registro de Tienda**:
    - Campos obligatorios: Nombre de la Empresa, Usuario Administrador, Contraseña, **Teléfono de Contacto**.
    - **Validación de Identidad**: El registro inicial deja la cuenta en estado `PENDING`. Se envía un correo (simulado en DEV) con un enlace de activación.
    - El usuario no puede iniciar sesión hasta validar su cuenta.
- **Login**: Acceso seguro con JWT. Roles: `ADMIN`, `MANAGER`, `CLIENT`.
- **Roles Diferenciados**:
    - **SuperAdmin**: Control total del SaaS, gestión de planes (activación/suspensión) y validación de pagos.
    - **Manager (Tienda)**: Administrador de un comercio local. Gestiona inventario, ventas y empleados.
    - **Client (Consumidor)**: Usuario final que realiza compras en el marketplace y acumula puntos.
- **Ciclo de Vida de Suscripción**:
    - **Plan FREE**: Limitado a 10 productos. Ideal para micro-negocios.
    - **Plan PREMIUM**: Inventario ilimitado, analíticas avanzadas y prioridad en búsquedas.
    - **Bloqueo por Impago**: Si una suscripción entra en estado `PAST_DUE`, el acceso al panel se bloquea automáticamente hasta regularizar el pago.

### 📦 Gestión de Inventario (Inventory)
- **Categorías Dinámicas**: Sistema híbrido donde existen categorías globales (fijas) y categorías personalizadas creadas por cada tienda. Ambas se sincronizan con el Marketplace.
- **Maestro de Productos**: Registro detallado con nombre, descripción, precio de costo/venta, SKU único (generación asistida) y stock.
- **Edición y Flujo**: Capacidad de mover productos entre categorías y actualizar precios en tiempo real.
- **Alertas de Stock Bajo**: Indicadores visuales en el dashboard para prevenir rupturas de inventario.

### 💰 Control de Ventas (Sales/POS)
- **Venta Presencial**: Interfaz para registrar ventas en el mostrador del local.
- **Gestión de Pedidos**: Recepción de pedidos del Marketplace. Flujo de estados: Pendiente -> Listo para Retiro -> Pagado/Entregado.
- **Despacho Automático**: Al registrar una venta, el sistema descuenta el stock del producto de forma inmediata.
- **Historial de Transacciones**: Consulta detallada de todas las ventas y pedidos por fecha, monto y método de pago (Efectivo/Transferencia/Otros).

### 🌐 Marketplace Sincronizado
- **Catálogo Global**: Coexistencia de productos de múltiples tiendas clasificados por categorías globales y personalizadas.
- **Búsqueda Avanzada**: Motor para encontrar productos por nombre, categoría o tienda en milisegundos.
- **Carrito de Compra**: Experiencia fluida para el cliente, permitiendo añadir productos de múltiples tiendas.

### ⭐ Sistema de Fidelización (Loyalty)
- **Acumulación de Puntos**: Los clientes registrados acumulan 1 punto por cada $1 de compra confirmada.
- **Portal del Cliente**: Espacio donde el usuario consulta sus órdenes pasadas y su saldo actual de puntos.

---

## 2. Flujo de Operación (Workflow)

1.  **Onboarding**: El comerciante se registra y crea su tienda. Inicia en el **Plan FREE** (Límite 10 productos).
2.  **Gestión de Catálogo**: El comerciante carga productos. Puede usar categorías globales ("Tecnología") o crear nichos específicos ("Fundas Retro").
3.  **Upgrade y Facturación**:
    - El comerciante solicita el plan Premium.
    - **SuperAdmin** valida el pago y activa el plan.
    - Si el pago no se procesa a tiempo, el SuperAdmin marca la cuenta como `PAST_DUE`, activando la **Pantalla de Bloqueo** en el dashboard del comerciante.
4.  **Venta**: 
    - Si es **local**, el vendedor registra la venta y el pago en el panel de control.
    - Si es **online (Marketplace)**, el pedido llega al panel como **PENDIENTE**. El vendedor prepara el pedido, notifica que está listo, y registra el **PAGO** manualmente al momento de la entrega (Efectivo, Transferencia, etc.).
5.  **KPIs**: El dashboard muestra en tiempo real ingresos, márgenes y rendimiento del negocio (Exclusivo Plan Premium).

---

## 3. Filosofía de Diseño
- **Estética Premium**: Uso intensivo de Glassmorphism, fuentes modernas y micro-animaciones para transmitir profesionalismo.
- **Eficiencia**: Interfaces limpias que priorizan la velocidad de registro de datos (especialmente en ventas).
- **Escalabilidad**: Estructura preparada para manejar miles de tiendas y productos concurrentes.

---
*Tiendario: El motor del comercio local. Antigravity © 2026*
