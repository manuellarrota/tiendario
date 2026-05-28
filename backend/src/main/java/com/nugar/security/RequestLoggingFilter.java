package com.nugar.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.Arrays;
import java.util.List;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    private static final List<String> EXCLUDED_PATHS = Arrays.asList(
            "/api/notifications/unread-count",
            "/api/notifications/count",
            "/api/dashboard/summary",
            "/favicon.ico"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        boolean shouldLog = EXCLUDED_PATHS.stream().noneMatch(uri::startsWith);

        long startTime = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        
        // Add request ID and User to MDC for traceability (even if not logging here, others will)
        MDC.put("requestId", requestId);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getName().equals("anonymousUser")) {
            MDC.put("user", authentication.getName());
        } else {
            MDC.put("user", "Público");
        }
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (shouldLog) {
                long duration = System.currentTimeMillis() - startTime;
                int status = response.getStatus();
                String method = request.getMethod();
                
                // Log all requests
                String queryString = request.getQueryString();
                String fullPath = uri + (queryString != null ? "?" + queryString : "");

                String description = resolveDescription(method, uri);
                logger.info("[HTTP] {} {} | {} | Status: {} | Duration: {}ms",
                    method, fullPath, description, status, duration);
            }
            MDC.clear();
        }
    }

    private String resolveDescription(String method, String uri) {
        // Shifts / Turnos
        if (method.equals("POST") && uri.matches(".*/shifts/\\d+/verify"))
            return "Gerente verificó cierre de Turno #" + uri.replaceAll(".*/shifts/(\\d+)/verify", "$1");
        if (method.equals("POST") && uri.endsWith("/shifts/open"))
            return "Cajero abrió turno de caja";
        if (method.equals("POST") && uri.matches(".*/shifts/\\d+/close"))
            return "Cajero cerró turno de caja #" + uri.replaceAll(".*/shifts/(\\d+)/close", "$1");

        // Auth
        if (method.equals("POST") && uri.endsWith("/auth/signin"))    return "Inicio de sesión";
        if (method.equals("POST") && uri.endsWith("/auth/signup"))    return "Registro de usuario";
        if (method.equals("POST") && uri.endsWith("/auth/signout"))   return "Cierre de sesión";

        // Pagos / Suscripciones
        if (method.equals("POST") && uri.endsWith("/payments/submit"))        return "Comprobante de pago enviado";
        if (method.equals("POST") && uri.matches(".*/payments/\\d+/approve")) return "SuperAdmin aprobó pago #" + uri.replaceAll(".*/payments/(\\d+)/approve", "$1");
        if (method.equals("POST") && uri.matches(".*/payments/\\d+/reject"))  return "SuperAdmin rechazó pago #" + uri.replaceAll(".*/payments/(\\d+)/reject", "$1");
        if (method.equals("POST") && uri.endsWith("/company/add-registers"))  return "Manager actualizó cajas extra";

        // Ventas / POS
        if (method.equals("POST") && uri.endsWith("/sales"))          return "Nueva venta registrada";
        if (method.equals("POST") && uri.matches(".*/sales/\\d+/refund")) return "Devolución procesada en venta #" + uri.replaceAll(".*/sales/(\\d+)/refund", "$1");

        // Inventario
        if (method.equals("POST")   && uri.endsWith("/products"))     return "Producto creado";
        if (method.equals("PUT")    && uri.matches(".*/products/\\d+")) return "Producto actualizado #" + uri.replaceAll(".*/products/(\\d+)", "$1");
        if (method.equals("DELETE") && uri.matches(".*/products/\\d+")) return "Producto eliminado #" + uri.replaceAll(".*/products/(\\d+)", "$1");

        // Compras
        if (method.equals("POST") && uri.endsWith("/purchases"))      return "Nueva compra registrada";

        // Config
        if (method.equals("PUT") && uri.endsWith("/admin/config"))    return "SuperAdmin actualizó configuración global";

        // Compañía
        if (method.equals("PUT")  && uri.endsWith("/company/profile")) return "Manager actualizó perfil de empresa";
        if (method.equals("POST") && uri.endsWith("/company/subscribe")) return "Empresa activó suscripción";

        // Admin / Usuarios
        if (method.equals("PUT")    && uri.matches(".*/admin/companies/\\d+")) return "SuperAdmin actualizó empresa #" + uri.replaceAll(".*/admin/companies/(\\d+)", "$1");
        if (method.equals("DELETE") && uri.matches(".*/admin/companies/\\d+")) return "SuperAdmin eliminó empresa #" + uri.replaceAll(".*/admin/companies/(\\d+)", "$1");

        // Genérico
        return method + " " + uri;
    }
}
