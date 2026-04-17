package com.tiendario.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
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
        if (authentication != null && authentication.isAuthenticated()) {
            MDC.put("user", authentication.getName());
        } else {
            MDC.put("user", "anonymous");
        }
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (shouldLog) {
                long duration = System.currentTimeMillis() - startTime;
                int status = response.getStatus();
                String method = request.getMethod();
                
                // Only log if it was a mutation (POST/PUT/DELETE) OR if it was an error (status >= 400)
                // This drastically reduces noise from GET requests while keeping audit visibility
                boolean isMutation = !method.equalsIgnoreCase("GET");
                boolean isError = status >= 400;

                if (isMutation || isError) {
                    String queryString = request.getQueryString();
                    String fullPath = uri + (queryString != null ? "?" + queryString : "");
                    logger.info("[HTTP] {} {} | Status: {} | Duration: {}ms", 
                        method, fullPath, status, duration);
                }
            }
            MDC.clear();
        }
    }
}
