# 💰 Estimación de Costos AWS para Tiendario

Este documento detalla los costos mensuales estimados para desplegar Tiendario en Amazon Web Services (Región `us-east-1`).

---

## 🎯 Escenario Objetivo: 100 Clientes Activos (SaaS)

**Perfil de Carga Estimado:**
*   **100 Comercios (Tenants)** usando el sistema diariamente.
*   **Usuario/Comercio:** ~2 usuarios concurrentes por tienda (200 usuarios simultáneos en horas pico).
*   **Inventario:** ~500 productos por tienda (Total: 50,000 productos indexados).
*   **Imágenes:** ~150 GB de almacenamiento en S3 (3 imágenes por producto).
*   **Tráfico:** ~300 GB de transferencia de datos mensual.

### 🏗️ Arquitectura Recomendada (Production Ready)

Para aguantar 100 clientes con buen rendimiento y sin caídas, necesitamos salir del "nivel gratuito" y usar instancias con capacidad de ráfaga decente.

| Servicio | Configuración Detallada | Costo Mensual Estimado |
| :--- | :--- | :--- |
| **Base de Datos (RDS)** | **PostgreSQL `db.t3.small`** (2 vCPU, 2GB RAM) <br> *La micro se queda corta para 100 conexiones simultáneas.* <br> + 50 GB Almacenamiento GP3 | **~$38.00 USD** |
| **Backend (App Runner)** | **AWS App Runner** (Auto-scaling) <br> *Configuración: 1 vCPU, 2 GB RAM.* <br> *Escalado: Min 1 instancia, Max 5 (Promedio 1.5 activas).* | **~$25.00 - $45.00 USD** <br> *(Depende del tráfico real)* |
| **Búsqueda (OpenSearch)** | **OpenSearch Service `t3.small.search`** <br> *Suficiente para <100k documentos.* <br> *Nota: Si usas una instancia reservada por 1 año, baja a ~$18.* | **~$28.00 USD** |
| **Storage (S3)** | **150 GB Standard** (Imágenes de productos) <br> + Costos de peticiones PUT/GET. | **~$4.50 USD** |
| **CDN (CloudFront)** | **300 GB Transferencia Saliente** <br> *Optimizado con caché (Hit ratio ~80%).* | **~$26.00 USD** |
| **WAF & Security** | AWS WAF (Reglas básicas) + Shield Standard. | **~$10.00 USD** |
| **Total Estimado** | **Para 100 Clientes** | **~$130.00 - $150.00 USD / mes** |
| **Costo por Cliente** | **Unit Economics** | **~$1.40 USD / cliente** |

> **💡 Análisis de Rentabilidad:**
> Si cobras **$10 USD/mes** por suscripción:
> *   Ingresos: **$1,000 USD**
> *   Infraestructura: **-$150 USD**
> *   Margen Bruto: **$850 USD (85%)** ✅ Excelente margen SaaS.

---

## 🚀 Opciones Alternativas (Comparativa)

### 1. Opción "Bootstrap" (Primeros 1-50 Clientes)
*Ahorro máximo, riesgo moderado de rendimiento.*
*   **EC2 `t3.medium`** (Todo en uno con Docker).
*   **RDS** local en el mismo Docker.
*   **S3** para imágenes.
*   **Total:** **~$45.00 USD / mes**.

### 2. Opción "High Availability" (500+ Clientes)
*Redundancia total, Multi-AZ.*
*   **RDS Multi-AZ** (x2 costo DB).
*   **ECS Fargate** (Cluster dedicado).
*   **OpenSearch Cluster** (3 nodos).
*   **Total:** **~$450.00+ USD / mes**.

---

## 📝 Próximos Pasos Recomendados

1.  **Empezar con la "Opción Bootstrap" ($45/mes)** hasta validar los primeros 10-20 clientes pagando.
2.  Una vez superes los 20 clientes, migrar la base de datos a **RDS `db.t3.small`** (el cuello de botella suele ser la DB).
3.  Al llegar a 80-100 clientes, desacoplar el Backend a **App Runner** o **ECS**.

---
*Cálculos basados en precios On-Demand de AWS us-east-1 vigentes a 2026. Los precios pueden variar según impuestos y uso de ancho de banda.*
