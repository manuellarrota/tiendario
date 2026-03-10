---
description: Arrancar el entorno de desarrollo completo de Tiendario
---

## Puertos del entorno

| Servicio | Puerto | URL |
|---|---|---|
| Backend API (Spring Boot) | 8080 | http://localhost:8080 |
| Frontend Admin (Vite) | 8081 | http://localhost:8081 |
| Frontend Market (Vite) | 8082 | http://localhost:8082 |
| PostgreSQL | 5432 | Interno (no expuesto al browser) |
| Elasticsearch | 9200 | http://localhost:9200 |

---

## Pasos

1. Verificar que no hay procesos previos en los puertos antes de arrancar

// turbo
2. Arrancar el backend (Spring Boot)
```
.\mvnw.cmd spring-boot:run
```
> Ejecutar en: `d:\emprendimiento\antigravity\tiendario\backend`
> Esperar mensaje: `Started TiendarioApplication` antes de continuar

// turbo
3. Arrancar el Frontend Admin en puerto 8081
```
npm run dev
```
> Ejecutar en: `d:\emprendimiento\antigravity\tiendario\frontend\admin`
> La config de Vite ya tiene definido el puerto 8081

// turbo
4. Arrancar el Frontend Market en puerto 8082
```
npm run dev
```
> Ejecutar en: `d:\emprendimiento\antigravity\tiendario\frontend\market`
> La config de Vite ya tiene definido el puerto 8082

---

## Credenciales de prueba

```
Super Admin:
  URL:      http://localhost:8081
  Usuario:  superadmin
  Password: Admin123!

Manager Premium:
  URL:      http://localhost:8081
  Usuario:  manager_pro  (o tienda_premium)
  Password: Manager123!

Manager Free:
  URL:      http://localhost:8081
  Usuario:  manager_free (o tienda_free)
  Password: Manager123!

Cliente Marketplace:
  URL:      http://localhost:8082
  Email:    cliente@test.com
  Password: Cliente123!
```
