# Escenario de Prueba Visual Realizado

Este documento describe los pasos ejecutados automáticamente para verificar el funcionamiento integral del sistema.

## 1. Configuración de Tiendas y Productos (Unificación)
Objetivo: Verificar que productos con el mismo nombre de diferentes tiendas se unifican en el Marketplace.

### Tienda A (Premium)
- **Usuario:** `manager_pro` / `123456`
- **Producto:** "Café Premium" - Precio $25.00 - Stock 100

### Tienda B (Free)
- **Usuario:** `manager_free` / `123456`
- **Producto:** "Café Premium" - Precio $22.50 - Stock 50

*Resultado Esperado:* En el Marketplace, al buscar "Café Premium", se debe mostrar una sola ficha de producto con opciones de compra de ambas tiendas.

## 2. Flujo de Compra Cliente
Objetivo: Realizar una compra multi-tienda y verificar notificaciones.

- **Cliente:** `cliente_test` (Nuevo registro)
- **Acción:**
  1.  Buscar "Café Premium".
  2.  Ver detalle (Comparar precios).
  3.  Agregar al carrito oferta de Tienda B (Más barato).
  4.  Agregar al carrito otro producto de Tienda A.
  5.  Checkout con opción "Pago en Tienda".

*Resultado Esperado:* Orden creada con estado `PENDING`. Desglose por tienda en confirmación.

## 3. Gestión de Pedidos (Admin)
Objetivo: Procesar la orden desde el punto de vista del vendedor.

### Tienda B (Vendedor)
- **Acción:**
  1.  Ir a "Gestión de Ventas".
  2.  Ver orden `PENDING` de `cliente_test`.
  3.  Cambiar estado a `READY_FOR_PICKUP` ("Listo por buscar").
  4.  Simular cliente llegando a tienda.
  5.  Cambiar estado a `PAID` ("Pagado y Entregado").

*KPIs Verificados:* Stock descontado, Ventas totales aumentadas en Dashboard.

## 4. Verificación Cliente
- **Acción:** Revisar dashboard de cliente para ver estado actualizado de la orden.
