# ☁️ Guía de Despliegue en AWS

Esta guía detalla la arquitectura recomendada y los pasos para desplegar **Nugar** en Amazon Web Services (AWS) para un entorno de producción escalable y seguro.

---

## 🏗️ Arquitectura de Producción (Cloud Native)

Para un sistema SaaS moderno, recomendamos una arquitectura "Serverless / Managed" para reducir la carga operativa:

1.  **Frontend (Admin & Market)**:
    -   **Servicio**: AWS S3 + CloudFront (CDN).
    -   **Beneficios**: Costo casi nulo, carga global ultrarrápida (CDN), SSL gratuito (ACM).
    -   **Artefactos**: Archivos estáticos generados por `npm run build`.

2.  **Backend (API)**:
    -   **Servicio**: **Amazon ECS (Fargate)**.
    -   **Beneficios**: Serverless (sin gestión de servidores), escalado automático por CPU/RAM, despliegue estandarizado con Docker.
    -   **Artefactos**: Imagen Docker (`nugar-backend`) en AWS ECR.

3.  **Base de Datos**:
    -   **Servicio**: Amazon RDS para PostgreSQL.
    -   **Beneficios**: Backups automáticos, alta disponibilidad, parches de seguridad.

4.  **Búsqueda (Search)**:
    -   **Servicio**: Amazon OpenSearch Service (Versión compatible con ES 7.10+).
    -   **Beneficios**: Cluster gestionado, integración con VPC.

---

## 📝 Variables de Entorno Requeridas

Configura estas variables en tu 'Task Definition' de ECS (o usa AWS Secrets Manager para las contraseñas):

| Variable | Descripción | Ejemplo / Valor |
|----------|-------------|-----------------|
| `SERVER_PORT` | Puerto de la aplicación | `8080` |
| `SPRING_DATASOURCE_URL` | URL JDBC de RDS | `jdbc:postgresql://<rds-endpoint>:5432/nugar` |
| `SPRING_DATASOURCE_USERNAME` | Usuario maestro RDS | `admin` |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña RDS | `******` |
| `SPRING_ELASTICSEARCH_URIS` | URL de OpenSearch | `https://<opensearch-endpoint>` |
| `APP_JWT_SECRET` | Llave secreta para tokens (Min 64 chars) | `(Generar cadena segura aleatoria)` |
| `STRIPE_API_KEY` | Llave privada de Stripe (Live) | `sk_live_...` (Opcional por ahora) |
| `STRIPE_SUCCESS_URL` | Retorno de pago exitoso | `https://admin.tudominio.com/dashboard?success=true` (Opcional) |
| `STRIPE_CANCEL_URL` | Retorno de pago cancelado | `https://admin.tudominio.com/dashboard?canceled=true` (Opcional) |

> **Nota**: Las variables de STRIPE son opcionales en la fase actual de "Solo Pedido / Pago Manual". Se requerirán cuando se active la pasarela de pagos online.

---

## 🚀 Pasos de Despliegue

### 1. Preparación de Recursos en AWS (Infraestructura)

1.  **RDS**: Crear instancia PostgreSQL (versión 13+). Asegurar que el *Security Group* permita tráfico desde el entorno del Backend.
2.  **OpenSearch**: Crear dominio (T2.small para pruebas, instancias dedicadas para prod).
3.  **S3 Buckets**: Crear 2 buckets públicos (o privados con OAI para CloudFront):
    -   `nugar-frontend-admin`
    -   `nugar-frontend-market`

### 2. Despliegue del Backend

Recomendamos usar **Docker** para garantizar consistencia.

1.  **Construir imagen**:
    ```bash
    cd backend
    docker build -t nugar-backend:latest .
    ```
2.  **Subir a ECR (Elastic Container Registry)**:
    ```bash
    aws ecr get-login-password | docker login ...
    docker tag nugar-backend:latest <aws-account-id>.dkr.ecr.<region>.amazonaws.com/nugar-backend:latest
    docker push ...
    ```
3.  **Amazon ECS (Fargate)**:
    -   **Cluster**: Crear un Cluster ECS (Networking only).
    -   **Task Definition**: Crear una nueva definición de tarea usando Fargate. (Ver ejemplo en `docs/aws/ecs-task-definition.json`).
    -   **Service**: Crear un servicio que ejecute la tarea, con un Load Balancer (ALB) si se requiere acceso público directo (o acceso desde CloudFront).

### 3. Despliegue de Frontends

1.  **Marketplace**:
    ```bash
    cd frontend/market
    # IMPORTANTE: Configurar URL del backend en producción antes de build
    # Crear archivo .env.production con: VITE_API_URL=https://api.tudominio.com
    npm install
    npm run build
    # Subir contenido de dist/ a S3
    aws s3 sync dist/ s3://nugar-frontend-market
    ```

2.  **Admin Panel**:
    ```bash
    cd frontend/admin
    # Crear archivo .env.production con: VITE_API_URL=https://api.tudominio.com
    npm install
    npm run build
    # Subir a S3
    aws s3 sync dist/ s3://nugar-frontend-admin
    ```

### 4. Configuración Final (CloudFront + SSL)

1.  Crear **CloudFront Distribution** para cada bucket S3.
2.  Usar **AWS Certificate Manager (ACM)** para generar certificados SSL gratuitos para tus dominios.
3.  Apuntar tus dominios (Route53) a las distribuciones de CloudFront.

---

## 🔄 Pipeline CI/CD (Recomendado)

Configurar GitHub Actions o AWS CodePipeline para:
1.  Detectar cambios en `main`.
2.  Correr tests (`mvn test`).
3.  Construir imagen Docker y subir a ECR.
4.  Actualizar el servicio de ECS con la nueva imagen (`aws ecs update-service ...`).
5.  Construir Frontends y sincronizar con S3.
