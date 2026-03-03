# 📘 Guía Técnica de Tiendario

Este documento detalla la arquitectura técnica, decisiones de diseño y flujos críticos del sistema Tiendario.

---

## 1. Arquitectura del Sistema

### 1.1 Backend (Spring Boot)
El núcleo del sistema es una API RESTful construida con **Spring Boot 2.7+** y **Java 11+**.
- **Seguridad**: Implementa `Spring Security` con autenticación **JWT (JSON Web Tokens)**. Los tokens contienen información vital (`companyId`, `subscriptionStatus`, `roles`) para evitar consultas redundantes a la base de datos.
- **Persistencia**:
    - **PostgreSQL**: Base de datos relacional primaria. Maneja usuarios, ventas, inventario y configuración.
    - **Elasticsearch**: Motor de búsqueda secundario. Indexa productos para búsquedas *full-text* rápidas en el Marketplace. Sincronizado vía eventos de aplicación.
- **Micro-kernel**: Aunque monolítico en despliegue, el código está modularizado en dominios (`com.tiendario.core`, `com.tiendario.market`, `com.tiendario.admin`).

### 1.2 Frontend (React + Vite)
Dos aplicaciones SPA (Single Page Applications) independientes:
- **Admin Panel (`/frontend/admin`)**:
    - **Tecnología**: React 19, Bootstrap 5, Vite.
    - **PWA**: Configurado con `vite-plugin-pwa` para instalación nativa y soporte offline básico.
    - **Enfoque**: Gestión densa de datos, tablas, reportes y POS. 
- **Marketplace (`/frontend/market`)**:
    - **Tecnología**: React 19, CSS Modules, Vite.
    - **Enfoque**: UX B2C, SEO amigable, carga rápida de imágenes, carrito persistente.

---

## 2. Sistema de Suscripciones

Tiendario implementa un modelo de negocio SaaS (Software as a Service) con restricciones fuertes a nivel de código.

### 2.1 Estados de Cuenta
El enum `SubscriptionStatus` define el ciclo de vida:
1.  **FREE**: Cuenta gratuita. Limitada a 10 productos. No puede registrar ventas.
2.  **TRIAL (7 Días)**: Funcionalidad completa por tiempo limitado. Al vencer pasa a `PAST_DUE`.
3.  **PAID**: Suscripción activa. Acceso ilimitado.
4.  **PAST_DUE**: Pago vencido. Acceso a lectura, pero bloqueo de creación (Productos/Ventas).
5.  **SUSPENDED**: Bloqueo total administrativo.

### 2.2 Flujo de Bloqueo
El frontend y backend colaboran para restringir el acceso:
- **Backend (`ProductController`, `SaleController`)**: Interceptores `@PreAuthorize` o validaciones manuales revisan el estado. Retornan `403 Forbidden` si una cuenta `PAST_DUE` intenta escribir datos.
- **Frontend (`AuthService`, `POSPage`)**:
    - Al iniciar sesión, se almacena el estado en `localStorage`.
    - Componentes visuales (`Alert`, `Button disabled`) bloquean la UI proactivamente.
    - Un componente global `OfflineAlert` monitoriza la conexión.

### 2.3 Simulación y Reactivación
- **Simulación**: Un endpoint `/api/payments/simulate-success` permite a los usuarios "pagar" instantáneamente en desarrollo.
- **Producción**: Preparado para integación con Stripe (librería `stripe-java` incluida).

---

## 3. PWA (Progressive Web App)

El Panel Administrativo es una PWA instalable.
- **Manifest**: `manifest.webmanifest` generado dinámicamente define nombre, colores e iconos.
- **Service Worker**: Cachea recursos estáticos (JS, CSS, Imágenes) para carga instantánea.
- **Instalación**: Los navegadores modernos ofrecerán instalar la app en el escritorio/móvil.

---

## 4. Estructura de Proyecto

```text
tiendario/
├── backend/            # Código fuente Java (Maven)
│   └── src/main/java/com/tiendario/
│       ├── domain/     # Entidades JPA (Product, Sale, User)
│       ├── repository/ # Interfaces Spring Data
│       ├── service/    # Lógica de negocio 
│       └── web/        # Controladores REST
├── frontend/
│   ├── admin/          # Panel PWA Admin
│   └── market/         # Landing + Marketplace
├── scripts/            # Utilidades
│   ├── tests/          # Scripts de prueba E2E (Node.js)
│   ├── archive/        # Scripts antiguos/debug
│   └── final_mega_seeder.js # Poblado de datos maestro
└── docs/               # Documentación del proyecto
```

---

## 5. Próximos Pasos Técnicos

1.  **Despliegue**: Dockerizar para producción (Nginx Reverse Proxy).
2.  **Stripe**: Implementar `StripeWebhookController` para recibir confirmaciones de pago reales.
3.  **CI/CD**: Automatizar tests con GitHub Actions.
