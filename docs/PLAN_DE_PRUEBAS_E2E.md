# Plan de Pruebas E2E - Tiendario

## Información General
- **Fecha**: 2026-02-02
- **Versión**: 1.0
- **Aplicación**: Tiendario - Sistema de Gestión de Inventario Multi-Tenant

---

## Tipos de Usuario

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **ROLE_ADMIN** | Super Administrador de la plataforma | Panel Admin completo |
| **ROLE_MANAGER** | Dueño/Gerente de tienda | Panel de su empresa |
| **ROLE_CLIENT** | Cliente del marketplace | Marketplace público |
| **Visitante** | Usuario no autenticado | Marketplace público (solo lectura) |

---

## Ambientes de Prueba

### URLs
- **Backend API**: http://localhost:8080/api
- **Frontend Admin**: http://localhost:5173
- **Frontend Marketplace**: http://localhost:5174

### Credenciales de Prueba (crear durante pruebas)
```
Super Admin:
  Usuario: superadmin
  Contraseña: Admin123!

Manager (Plan FREE):
  Usuario: tienda_free
  Contraseña: Manager123!
  Empresa: Tienda Demo Free

Manager (Plan PAID):
  Usuario: tienda_premium
  Contraseña: Manager123!
  Empresa: Tienda Demo Premium

Cliente:
  Usuario: cliente@test.com
  Contraseña: Cliente123!
```

---

## MÓDULO 1: AUTENTICACIÓN Y REGISTRO

### 1.1 Registro de Nueva Tienda (Manager)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AUTH-01 | Registro exitoso de tienda | 1. Ir a /register 2. Llenar nombre empresa 3. Llenar usuario 4. Llenar contraseña 5. Click "Registrar" | Mensaje exitoso, redirección a login |
| AUTH-02 | Registro con usuario duplicado | 1. Intentar registrar con usuario existente | Mensaje de error "username already taken" |
| AUTH-03 | Registro con campos vacíos | 1. Dejar campos vacíos 2. Click registrar | Validación HTML5 previene envío |

### 1.2 Login
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AUTH-04 | Login exitoso Manager | 1. Ir a /login 2. Ingresar credenciales válidas 3. Click "Ingresar" | Redirección a /dashboard |
| AUTH-05 | Login con credenciales inválidas | 1. Ingresar contraseña incorrecta | Mensaje error "Invalid credentials" |
| AUTH-06 | Login con "Recuérdame" activado | 1. Marcar checkbox 2. Login 3. Cerrar navegador 4. Reabrir | Sesión persistida en localStorage |
| AUTH-07 | Login sin "Recuérdame" | 1. Login sin checkbox 2. Cerrar navegador 4. Reabrir | Sesión no persistida |

### 1.3 Logout
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AUTH-08 | Logout exitoso | 1. Estar logueado 2. Click en "Cerrar Sesión" | Redirección a login, sesión eliminada |

---

## MÓDULO 2: PANEL MANAGER (Plan FREE)

### 2.1 Dashboard
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DASH-01 | Ver dashboard básico | 1. Login como Manager FREE 2. Ir a Dashboard | Ver total productos, badge "Plan Gratuito" |
| DASH-02 | CTA de upgrade visible | 1. Verificar panel de upgrade | Botón "Actualizar Ahora" visible |

### 2.2 Gestión de Productos (Inventario)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| PROD-01 | Listar productos | 1. Ir a Inventario | Ver tabla con productos de la empresa |
| PROD-02 | Crear producto nuevo | 1. Click "Nuevo Producto" 2. Llenar formulario 3. Guardar | Producto aparece en lista |
| PROD-03 | Crear producto con SKU automático | 1. Llenar nombre y categoría 2. Ver sugerencia SKU 3. Guardar | SKU generado automáticamente |
| PROD-04 | Editar producto existente | 1. Click en producto 2. Modificar datos 3. Guardar | Datos actualizados |
| PROD-05 | Eliminar producto | 1. Click en eliminar 2. Confirmar | Producto removido de lista |
| PROD-06 | Producto sin imagen | 1. Crear producto sin imagen | Imagen placeholder mostrada |
| PROD-07 | Validar stock negativo | 1. Intentar stock < 0 | Validación de campo numérico |

### 2.3 Gestión de Categorías
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CAT-01 | Listar categorías | 1. Ir a Categorías | Ver categorías de la empresa |
| CAT-02 | Crear categoría | 1. Click "Nueva" 2. Nombre y descripción 3. Guardar | Categoría creada |
| CAT-03 | Eliminar categoría | 1. Click eliminar 2. Confirmar | Categoría removida |

### 2.4 Punto de Venta (POS)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| POS-01 | Agregar producto al carrito | 1. Buscar producto 2. Click agregar | Producto en carrito |
| POS-02 | Modificar cantidad en carrito | 1. Cambiar cantidad | Total actualizado |
| POS-03 | Remover producto del carrito | 1. Click eliminar producto | Producto removido |
| POS-04 | Completar venta | 1. Agregar productos 2. Click "Cobrar" | Venta registrada, stock reducido |
| POS-05 | Venta sin stock suficiente | 1. Intentar vender más de stock | Error "Insufficient stock" |
| POS-06 | Seleccionar cliente existente | 1. Buscar cliente 2. Seleccionar | Cliente asociado a venta |

### 2.5 Historial de Ventas
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| SALE-01 | Ver historial de ventas | 1. Ir a Ventas | Lista de ventas con fecha y total |
| SALE-02 | Ver detalle de venta | 1. Click en venta | Detalle con productos vendidos |
| SALE-03 | Cambiar estado de venta | 1. Cambiar estado (PAID/PENDING/CANCELLED) | Estado actualizado |

### 2.6 Gestión de Clientes
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CUST-01 | Listar clientes | 1. Ir a Clientes | Ver clientes de la empresa |
| CUST-02 | Crear cliente | 1. Nuevo cliente 2. Llenar datos 3. Guardar | Cliente creado |
| CUST-03 | Editar cliente | 1. Editar cliente existente | Datos actualizados |
| CUST-04 | Email duplicado | 1. Crear cliente con email existente | Error de duplicado |

### 2.7 Gestión de Proveedores
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| SUPP-01 | Listar proveedores | 1. Ir a Proveedores | Ver proveedores |
| SUPP-02 | Crear proveedor | 1. Nuevo proveedor 2. Llenar datos | Proveedor creado |

### 2.8 Compras (Abastecimiento)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| PURCH-01 | Registrar compra | 1. Nueva compra 2. Seleccionar proveedor 3. Agregar productos | Compra registrada, stock aumentado |
| PURCH-02 | Compra sin proveedor | 1. Compra sin seleccionar proveedor | Compra registrada igualmente |
| PURCH-03 | Ver historial de compras | 1. Ir a historial | Lista de compras con costos |

### 2.9 Notificaciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| NOTIF-01 | Ver notificaciones | 1. Click en campana | Lista de notificaciones |
| NOTIF-02 | Marcar como leída | 1. Click en notificación | Estado cambia a leída |
| NOTIF-03 | Badge de no leídas | 1. Verificar contador | Número correcto de no leídas |

---

## MÓDULO 3: PANEL MANAGER (Plan PAID/Premium)

### 3.1 Dashboard Premium
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| PREM-01 | Ver métricas completas | 1. Login como Premium | Ver: Ventas hoy, Margen, Alertas stock |
| PREM-02 | Sin badge de plan gratuito | 1. Verificar UI | No aparece "Plan Gratuito" |
| PREM-03 | Botón downgrade visible | 1. Ver dashboard | Botón "Simular Regreso a Plan Gratis" |

### 3.2 Upgrade/Downgrade de Plan
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| PLAN-01 | Upgrade a Premium | 1. Login FREE 2. Click "Actualizar Ahora" | Status cambia a PAID |
| PLAN-02 | Downgrade a Free | 1. Login Premium 2. Click downgrade | Status cambia a FREE |

---

## MÓDULO 4: SUPER ADMIN

### 4.1 Dashboard Global
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ADMIN-01 | Ver estadísticas globales | 1. Login como Admin | Ver: Empresas, Usuarios, GMV, Suscripciones |
| ADMIN-02 | Badge Super Admin | 1. Ver dashboard | Badge "Super Admin" visible |

### 4.2 Gestión de Empresas
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ADMIN-03 | Listar todas las empresas | 1. Ir a Empresas | Tabla con todas las empresas |
| ADMIN-04 | Filtrar por estado de suscripción | 1. Filtrar por FREE/PAID | Lista filtrada correctamente |

### 4.3 Gestión de Usuarios
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ADMIN-05 | Listar todos los usuarios | 1. Ir a Usuarios | Tabla con usuarios del sistema |
| ADMIN-06 | Ver empresa de usuario | 1. Ver detalle de usuario | Empresa asociada visible |

### 4.4 Gestión de Pagos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ADMIN-07 | Ver historial de pagos | 1. Ir a Pagos | Lista de pagos de suscripciones |

### 4.5 Configuración de Plataforma
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ADMIN-08 | Ver configuración | 1. Ir a Configuración | Ver parámetros del sistema |
| ADMIN-09 | Modificar configuración | 1. Cambiar valor 2. Guardar | Configuración actualizada |

---

## MÓDULO 5: MARKETPLACE (Clientes)

### 5.1 Navegación Pública
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| MARKET-01 | Ver página principal | 1. Ir a marketplace | Hero, categorías, productos destacados |
| MARKET-02 | Buscar productos | 1. Escribir en buscador | Productos filtrados por nombre |
| MARKET-03 | Filtrar por categoría | 1. Click en categoría | Productos de esa categoría |
| MARKET-04 | Ver todos los productos sin filtro | 1. Limpiar búsqueda | Todos los productos visibles |

### 5.2 Registro de Cliente
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| MARKET-05 | Registro de cliente | 1. Click "Crear cuenta" 2. Llenar datos | Cliente registrado |
| MARKET-06 | Login de cliente | 1. Login con credenciales | Acceso a dashboard cliente |

### 5.3 Dashboard Cliente
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| MARKET-07 | Ver historial de pedidos | 1. Ir a "Mis Pedidos" | Lista de pedidos del cliente |
| MARKET-08 | Ver puntos de fidelidad | 1. Ver puntos acumulados | Puntos visibles |

### 5.4 Proceso de Compra
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| MARKET-09 | Agregar producto al carrito | 1. Click "Agregar" en producto | Producto en carrito |
| MARKET-10 | Ver comparación de vendedores | 1. Click en producto con varios vendedores | Lista de vendedores con precios |
| MARKET-11 | Seleccionar vendedor preferido | 1. Elegir vendedor | Producto de ese vendedor agregado |
| MARKET-12 | Completar pedido | 1. Ir a checkout 2. Confirmar | Pedido creado |

---

## MÓDULO 6: MULTI-TENANCY

### 6.1 Aislamiento de Datos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| TENANT-01 | Productos aislados | 1. Login Tienda A 2. Ver productos 3. Login Tienda B | Solo productos de cada tienda |
| TENANT-02 | Clientes aislados | 1. Crear cliente en Tienda A 2. Verificar en Tienda B | Cliente no visible en otra tienda |
| TENANT-03 | Ventas aisladas | 1. Verificar ventas de cada tienda | Solo ventas propias visibles |
| TENANT-04 | Categorías aisladas | 1. Crear categoría en Tienda A | No visible en Tienda B |

---

## MÓDULO 7: RESPONSIVE Y UX

### 7.1 Responsividad
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| UX-01 | Admin Panel en móvil | 1. Viewport 375px 2. Navegar | Menú colapsable, contenido adaptado |
| UX-02 | Marketplace en móvil | 1. Viewport 375px 2. Navegar | Diseño adaptado, usable |
| UX-03 | Formularios en tablet | 1. Viewport 768px | Formularios legibles y usables |

### 7.2 Experiencia de Usuario
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| UX-04 | Loading states | 1. Cargar páginas con datos | Spinners durante carga |
| UX-05 | Mensajes de error claros | 1. Provocar errores | Mensajes entendibles |
| UX-06 | Confirmaciones de acciones | 1. Eliminar items | Confirmación antes de borrar |

---

## Orden de Ejecución Recomendado

1. **Preparación**: Iniciar backend y frontends
2. **AUTH**: Pruebas de autenticación (crear usuarios de prueba)
3. **Manager FREE**: Funcionalidades básicas
4. **Manager PAID**: Upgrade y funcionalidades premium
5. **ADMIN**: Gestión global
6. **MARKET**: Flujo de cliente
7. **TENANT**: Verificar aislamiento
8. **UX**: Responsividad

---

## Notas de Ejecución

### Pre-requisitos
- [ ] Backend ejecutándose en puerto 8080
- [ ] Frontend Admin en puerto 5173
- [ ] Frontend Market en puerto 5174
- [ ] Base de datos H2 limpia (o PostgreSQL configurada)

### Durante las Pruebas
- Capturar screenshots de errores
- Registrar tiempos de carga
- Verificar consola del navegador por errores JS
- Verificar Network tab por errores HTTP

---

**Total de Casos de Prueba**: 67
