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

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long startTime = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        
        // Add request ID to MDC for traceability
        MDC.put("requestId", requestId);
        
        try {
            // Check if user is authenticated (might be empty if this filter is before AuthTokenFilter)
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                MDC.put("user", authentication.getName());
            } else {
                MDC.put("user", "anonymous");
            }

            String method = request.getMethod();
            String uri = request.getRequestURI();
            String queryString = request.getQueryString();
            String fullPath = uri + (queryString != null ? "?" + queryString : "");

            logger.info("Incoming request [{}]: {} {}", requestId, method, fullPath);

            filterChain.doFilter(request, response);

            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            
            logger.info("Outgoing response [{}]: {} {} - Status: {} - Duration: {}ms", 
                requestId, method, uri, status, duration);

        } finally {
            MDC.clear();
        }
    }
}
