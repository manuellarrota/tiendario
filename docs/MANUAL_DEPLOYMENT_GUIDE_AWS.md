# 📘 Guía Manual de Despliegue en AWS (Paso a Paso)

Este documento complementa la automatización CI/CD detallando los pasos **únicos** de configuración de infraestructura que debes realizar manualmente en la consola de AWS para preparar el entorno de producción.

---

## 🛠 1. Configuración de Red y Seguridad (VPC & IAM)

### 1.1 Usuario IAM para GitHub Actions
Para que GitHub pueda desplegar, necesita un usuario con permisos.
1.  Entra a **IAM** > **Users** > **Create user**.
2.  Nombre: `github-actions-deployer`.
3.  Permisos: Selecciona "Attach policies directly".
4.  Busca y selecciona:
    -   `AmazonEC2ContainerRegistryFullAccess` (Para subir Docker images).
    -   `AmazonECS_FullAccess` (Para actualizar el servicio).
    -   `AmazonS3FullAccess` (Para subir el frontend).
5.  Crea el usuario.
6.  Ve a la pestaña **Security credentials** del usuario creado > **Create access key** > Selecciona "Command Line Interface (CLI)".
7.  🚨 **Copia y guarda** el `Access Key ID` y el `Secret access key` inmediatamente. No podrás verlos de nuevo.

---

## 🗄 2. Base de Datos (Amazon RDS)

### 2.1 Crear la Base de Datos PostgreSQL
1.  Ve a **RDS** > **Databases** > **Create database**.
2.  **Creation method**: Standard create.
3.  **Engine options**: PostgreSQL (Versión 13 o superior).
4.  **Templates**: Free tier (o Production si tienes presupuesto).
5.  **Settings**:
    -   Identifier: `tiendario-db-prod`.
    -   Master username: `postgres` (o el que prefieras).
    -   Master password: `(Genera una contraseña fuerte)`.
6.  **Instance configuration**: `db.t3.micro` (Económico).
7.  **Connectivity**:
    -   Public access: **No** (Recomendado para seguridad).
    -   VPC Security Group: Crea uno nuevo llamado `rds-private-group`.
8.  **Create database**.
9.  ⏳ Espera unos minutos y copia el **Endpoint** (ej: `tiendario-db.cx7...amazon.com`).

---

## 🐳 3. Backend (ECR y ECS)

### 3.1 Crear Repositorio de Imágenes (ECR)
1.  Ve a **Elastic Container Registry**.
2.  **Create repository**.
3.  Visibility settings: **Private**.
4.  Repository name: `tiendario-backend`.
5.  **Create repository**. 
6.  Copia la **URI** del repositorio.

### 3.2 Crear Cluster ECS
1.  Ve a **Elastic Container Service** > **Clusters**.
2.  **Create Cluster**.
3.  Name: `tiendario-cluster`.
4.  Infrastructure: **AWS Fargate (Serverless)**.
5.  **Create**.

### 3.3 Definir la Tarea (Task Definition)
Esto le dice a AWS cómo correr tu Docker.
1.  Ve a **Task Definitions** > **Create new Task Definition**.
2.  Family name: `tiendario-task`.
3.  **Infrastructure**: Fargate.
4.  **Container - 1**:
    -   Name: `tiendario-container`.
    -   Image URI: `(Pega la URI de ECR creada en 3.1):latest`.
    -   Container Port: `8080`.
5.  **Environment variables** (Aquí va la configuración):
    -   Key: `SPRING_DATASOURCE_URL`, Value: `jdbc:postgresql://(Endpoint de RDS):5432/postgres`
    -   Key: `SPRING_DATASOURCE_USERNAME`, Value: `(Usuario RDS)`
    -   Key: `SPRING_DATASOURCE_PASSWORD`, Value: `(Password RDS)`
    -   Key: `STRIPE_API_KEY`, Value: `(Tu llave de Stripe)`
    -   Key: `APP_JWT_SECRET`, Value: `(Clave aleatoria larga)`
6.  **Create**.

### 3.4 Crear el Servicio y Load Balancer
Esto expone tu API a internet.
1.  Entra al Cluster `tiendario-cluster` > Pestaña **Services** > **Create**.
2.  Compute options: **Launch type** (Fargate).
3.  Task definition: Family `tiendario-task`.
4.  Service name: `tiendario-service`.
5.  **Networking**:
    -   Security Group: Crea uno nuevo. Agrega regla Inbound: `HTTP (80)` desde `Anywhere (0.0.0.0/0)`.
6.  **Load Balancing** (IMPORTANTE):
    -   Load balancer type: **Application Load Balancer**.
    -   Load balancer name: `tiendario-alb`.
    -   Listener: Port 80 (HTTP).
    -   Target group: Create new specific target group.
7.  **Create**.
8.  Copia el **DNS name** del Load Balancer creado (ej: `tiendario-alb-123.us-east-1.elb.amazonaws.com`). Esta será tu `VITE_API_URL`.

---

## 🌐 4. Frontend (S3 y CloudFront)

### 4.1 Crear Buckets S3
1.  Ve a **S3** > **Create bucket**.
2.  Nombre: `tiendario-frontend-market-prod` (Debe ser único en el mundo).
3.  Configuración: Bloquear acceso público (Déjalo activado si usas CloudFront OAI, o desactívalo si quieres hosting web rápido y simple).
4.  Repite para `tiendario-frontend-admin-prod`.

### 4.2 Distribuir con CloudFront (CDN)
1.  Ve a **CloudFront** > **Create distribution**.
2.  **Origin Domain**: Selecciona el bucket S3 del marketplace.
3.  **S3 Bucket Access**:
    -   Selecciona: "Yes use OAI (Origin Access Identity)".
    -   "Create new OAI".
    -   "Yes, update bucket policy" (Esto configura los permisos automáticamente).
4.  **Viewer Config**:
    -   Viewer protocol policy: `Redirect HTTP to HTTPS`.
5.  **Create Distribution**.
6.  Repite para el bucket de Admin.

---

## 🔑 5. Conexión Final

Por último, ve a tu repositorio GitHub para conectar todo.

1.  GitHub Repo > **Settings** > **Secrets and variables** > **Actions**.
2.  Crea los secrets con la información recolectada:
    -   `AWS_ACCESS_KEY_ID` (Del paso 1.1)
    -   `AWS_SECRET_ACCESS_KEY` (Del paso 1.1)
    -   `ECR_REPOSITORY` = `tiendario-backend`
    -   `ECS_CLUSTER` = `tiendario-cluster`
    -   `ECS_SERVICE` = `tiendario-service`

¡Listo! La próxima vez que hagas push a `master`, GitHub Actions construirá el código y lo enviará a esta infraestructura.
