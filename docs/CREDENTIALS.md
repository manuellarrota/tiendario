# Credenciales de Acceso — Entorno Local

Cuentas pre-cargadas para pruebas en desarrollo.

> **Importante:** Estas credenciales son solo para entorno local con PostgreSQL.
> En producción se deben crear usuarios reales y cambiar todas las contraseñas.

---

## Super Admin

| Campo | Valor |
|---|---|
| URL | http://localhost:8081 |
| Usuario | `admin` |
| Contraseña | `Admin123!` |
| Acceso | Panel completo + secciones `/admin/*` |

## Managers (Panel Administrativo)

| Usuario | Contraseña | Tienda | Plan |
|---|---|---|---|
| `manager_pro` | `Manager123!` | Tienda Demo Premium | PAID |
| `manager_free` | `Manager123!` | Tienda Egar | PAID |

URL de acceso: http://localhost:8081

## Clientes (Marketplace)

| Usuario | Contraseña | Rol |
|---|---|---|
| `cliente` | `Cliente123!` | Comprador |

URL de acceso: http://localhost:8082

---

## Notas

- Las cuentas nuevas creadas desde el formulario de registro quedan **inactivas** hasta ser aprobadas.
  Para activarlas en desarrollo, usa el link en `backend/verification_links.txt` o aprueba desde el Super Admin.
- El Super Admin puede activar/desactivar cualquier cuenta desde `/admin/users`.
