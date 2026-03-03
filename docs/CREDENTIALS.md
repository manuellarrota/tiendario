# 🔐 Credenciales de Acceso (Entorno Local/Demo)

Estas cuentas han sido generadas automáticamente por el `DataInitializer` para pruebas.

---

## 👑 Super Admin (Gestión Global)
*   **URL**: [http://localhost:8081](http://localhost:8081) (Accede con rol Admin)
*   **Usuario**: `admin`
*   **Contraseña**: `admin123`

## 💼 Manager (Dueño de Tienda) - Panel Administrativo
Accede desde: [http://localhost:8081](http://localhost:8081)

### Opción A: Plan PREMIUM
*   **Usuario**: `manager_pro`
*   **Contraseña**: `manager123`
*   **Tienda**: "Tienda Demo Premium"
*   **Características**: Suscripción activa (PAID), acceso total.

### Opción B: Tienda Egar
*   **Usuario**: `manager_free`
*   **Contraseña**: `manager123`
*   **Tienda**: "Tienda Egar"
*   **Características**: Suscripción PAID, acceso total.

## 🛒 Cliente Final - Marketplace
Accede desde: [http://localhost:8082](http://localhost:8082)

*   **Usuario**: `cliente`
*   **Contraseña**: `cliente123`
*   **Rol**: Comprador
*   **Puntos**: 0 (Inicial)

---

> **Nota**: Estas credenciales solo aplican para la base de datos en memoria (H2) de desarrollo.
> En producción con PostgreSQL se deben crear usuarios reales.

> **Importante**: Si registras **nuevas** tiendas desde el formulario, se crean **inactivas**. Para activarlas en desarrollo, abre el archivo `backend/verification_links.txt` y copia el enlace de validación en el navegador.
