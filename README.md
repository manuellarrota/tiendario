# 🚀 Tiendario - SaaS de Control de Inventario y Marketplace

Tiendario es una solución integral para comercios locales que combina un potente sistema de gestión interna (**Control de Ventas e Inventario**) con un **Marketplace Global** sincronizado.

---

## 🏗️ Arquitectura del Sistema
El proyecto sigue una arquitectura **Cliente-Servidor (Desacoplada)** de alto rendimiento:

1.  **Backend (API de Servicios)**: Desarrollado en **Java 11+ / Spring Boot 2.7+**.
    -   **Organización**: Dividido en capas (*Controller, Service, Repository, Domain*).
    -   **Persistencia Híbrida**: 
        -   **Relacional**: PostgreSQL para transacciones, usuarios, pedidos y suscripciones.
        -   **NoSQL / Búsqueda**: Elasticsearch para indexación global y búsquedas ultra-rápidas en el Marketplace.
    -   **Seguridad**: Spring Security con **JWT** para sesiones sin estado.
2.  **Frontend (Hub de Aplicaciones)**: Dos aplicaciones **React 19+** independientes optimizadas con **Vite**.
    -   **Frontend Admin**: Panel interno para dueños de comercios. Gestión de stock, registro de compras/ventas y KPIs.
    -   **Frontend Market**: Portal para clientes finales. Carrito, catálogo compartido y gestión de puntos.
3.  **UI/UX Moderno**: Estética basada en **Glassmorphism**, paletas de colores vibrantes y tipografía premium (**Outfit**).

---

## 📂 Estructura Organizada
```text
tiendario/
├── backend/            # Servidor API REST (Spring Boot)
├── frontend/           # Aplicaciones de usuario
│   ├── admin/          # Panel PWA de Gestión (localhost:8081)
│   └── market/         # Marketplace y Portal (localhost:8082)
├── scripts/            # Herramientas de automatización
│   ├── tests/          # Scripts de validación E2E
│   └── legacy/         # Scripts antiguos
├── docs/               # Documentación Técnica y Funcional
├── README.md           # Resumen Ejecutivo
└── docs/IMPLEMENTATION_PLAN.md # Hoja de Ruta
```
> 📘 Para detalles profundos sobre arquitectura y flujos, ver [docs/GUIA_TECNICA.md](docs/GUIA_TECNICA.md).

---

## 🛠️ Tecnologías Principales
- **Backend**: Spring Boot, Hibernate, JPA, Java 11+.
- **Bases de Datos**: PostgreSQL, Elasticsearch.
- **Frontend**: React, React-Bootstrap, Vite.
- **Estilos**: Vanilla CSS (Modern CSS 3), Glassmorphism.
- **Seguridad**: JWT, BCrypt.

---

## ☁️ Despliegue en Producción
Para desplegar en AWS, consulta nuestra **[Guía de Despliegue](docs/DEPLOYMENT.md)**.

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Requisitos Previos
- Docker (para base de datos y buscador).
- Java 11+.
- Node.js 18+.

### 2. Iniciar Servicios Externos
```bash
# Desde la raíz (si hay docker-compose)
cd scripts && docker-compose up -d
```

### 3. Iniciar el Backend
```bash
cd backend
.\mvnw.cmd spring-boot:run
```

### 4. Iniciar los Frontends
En terminales separadas:
```bash
# Admin Panel
cd frontend/admin
npm install && npm run dev

# Marketplace
cd frontend/market
npm install && npm run dev
```

---

## 📈 Funcionalidades Clave
- ✅ **Control Total**: Registro de entrada (Compras) y salida (Ventas locales).
- ✅ **Gestión Flexible**: Categorías dinámicas (Globales + Personalizadas).
- ✅ **Visibilidad Global**: Sincronización automática de stock con el Marketplace.
- ✅ **Suscripciones**: Sistema completo de planes (FREE, TRIAL, PAID) con gestión de estados (Vencido, Suspendido), simulación de pagos y restricciones de acceso.
- ✅ **Multimedia Core**: Subida directa de imágenes de productos y servidor de archivos estáticos integrado.
- ✅ **Centro de Comunicaciones**: Sistema de emails HTML branded y notificaciones internas en tiempo real.
- ✅ **Fidelización y Cercanía**: Acumulación de puntos por compras y búsqueda de tiendas por geolocalización.
- ✅ **Confianza Legal**: Páginas integradas de Términos de Servicio y Privacidad.
- ✅ **Diseño Premium**: Interfaz fluida y profesional con estética Glassmorphism.

---

Servicio | Estado | URL de Acceso
---|---|---
Backend API | ✅ Up (Started) | http://localhost:8080
Base de Datos | ✅ Healthy | Puerto 5432 (Interno)
Elasticsearch | ✅ Healthy | http://localhost:9200
Frontend Admin | ✅ Up (Started) | http://localhost:8081
Frontend Market | ✅ Up (Started) | http://localhost:8082

---

## 🔐 Credenciales de Prueba (Entorno Local)
Utiliza estas cuentas pre-cargadas para probar los diferentes roles y planes del sistema:

| Rol | Usuario | Contraseña | Acceso | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | [Admin Panel](http://localhost:8081) | Acceso global, gestión de plataforma. |
| **Tienda Premium** | `manager_pro` | `manager123` | [Admin Panel](http://localhost:8081) | Plan PAID, Tienda Demo Premium. Acceso total. |
| **Tienda Gratuita** | `manager_free` | `manager123` | [Admin Panel](http://localhost:8081) | Plan PAID, Tienda Egar. |
| **Cliente** | `cliente` | `cliente123` | [Marketplace](http://localhost:8082) | Comprador del Marketplace, acumula puntos. |

> **Nota**: Estas credenciales solo aplican para la base de datos en memoria (H2) de desarrollo.
> En producción con PostgreSQL se deben crear usuarios reales.

> **Importante**: Si registras **nuevas** tiendas desde el formulario, se crean **inactivas**. Para activarlas en desarrollo, abre el archivo `backend/verification_links.txt` y copia el enlace de validación.
