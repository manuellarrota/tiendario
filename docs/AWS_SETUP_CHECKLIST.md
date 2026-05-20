# ✅ Checklist de Configuración Final (AWS + GitHub)

Sigue estos pasos en orden para dejar tu infraestructura lista y conectada.

---

## 🏗️ Fase 1: Creación de Recursos en AWS (Consola)

### 1. IAM (Identidad y Seguridad)
- [ ] Crear un usuario IAM llamado `github-actions-deployer`.
- [ ] Asignarle permisos (Policy): `AdministratorAccess` (Ojo: Para producción estricta, deberías limitar permisos a solo ECR, ECS, S3).
- [ ] **Guardar**: `Access Key ID` y `Secret Access Key`.

### 2. ECR (Registry de Docker)
- [ ] Ir a **Elastic Container Registry**.
- [ ] Crear repositorio privado: `nugar-backend`.
- [ ] Copiar la **URI** (Ej: `123456789.dkr.ecr.us-east-1.amazonaws.com/nugar-backend`).

### 3. S3 (Hosting Frontend)
- [ ] Crear Bucket: `nugar-frontend-admin-prod` (Desactivar "Block Public Access" si no usas CloudFront OAI).
- [ ] Crear Bucket: `nugar-frontend-market-prod`.
- [ ] Activar "Static Website Hosting" en ambos buckets.

### 4. RDS (Base de Datos)
- [ ] Crear base de datos **PostgreSQL** (Free tier: `db.t3.micro`).
- [ ] Configurar acceso: Asegúrate que tenga acceso público (o mejor, configurar Security Group para permitir acceso desde ECS - *avanzado*).
- [ ] **Guardar**: `Endpoint` (URL), `Usuario` y `Contraseña`.

### 5. OpenSearch (Opcional por costo)
- [ ] (Opcional) Crear dominio OpenSearch. Si omites esto, el buscador no funcionará en producción hasta que lo actives.

---

## 🔗 Fase 2: Configurar GitHub

Ve a tu repositorio en GitHub -> **Settings** -> **Secrets and variables** -> **Actions** -> **Repository secrets**.

### Agregar las siguientes claves:
| Nombre del Secret | Valor |
|-------------------|-------|
| `AWS_ACCESS_KEY_ID` | Tu clave de IAM (Paso 1) |
| `AWS_SECRET_ACCESS_KEY` | Tu secreto de IAM (Paso 1) |
| `ECR_REPOSITORY` | `nugar-backend` |
| `ECS_CLUSTER` | Nombre de tu cluster ECS (Ej: `nugar-cluster`) |
| `ECS_SERVICE` | Nombre de tu servicio ECS (Ej: `nugar-service`) |

---

## 🚀 Fase 3: Despliegue Inicial

1.  Hacer un cambio pequeño en `master` o disparar el workflow manualmente (si está habilitado `workflow_dispatch`).
2.  Verificar en la pestaña **Actions** de GitHub que el Pipeline corra en verde.

---

## 💡 Notas Importantes
- **Archivos de Configuración**: Recuerda que para ECS, debes crear el "Service" manualmente la primera vez en la consola de AWS, seleccionando la "Task Definition" que subiremos.
- **Variables de Entorno**: En la definición de la tarea (Task Definition) dentro de ECS, es donde pegarás la URL de tu base de datos RDS y la clave de Stripe.

¡Con esto completas el ciclo! 🏁
