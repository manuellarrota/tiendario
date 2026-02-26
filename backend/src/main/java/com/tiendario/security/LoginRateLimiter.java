package com.tiendario.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory rate limiter for login attempts.
 * Tracks attempts per IP address and blocks after MAX_ATTEMPTS
 * within the WINDOW_SECONDS timeframe.
 */
@Component
public class LoginRateLimiter {

    private static final Logger logger = LoggerFactory.getLogger(LoginRateLimiter.class);
    private static final int MAX_ATTEMPTS = 5;
    private static final int WINDOW_SECONDS = 60; // 1 minute window
    private static final int BLOCK_SECONDS = 300; // 5 minute block after exceeding

    private final ConcurrentHashMap<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    /**
     * Check if the given key (IP or username) is allowed to attempt login.
     * 
     * @return true if allowed, false if rate limited
     */
    public boolean isAllowed(String key) {
        cleanup();
        AttemptInfo info = attempts.get(key);
        if (info == null) {
            return true;
        }

        // If in block period
        if (info.blockedUntil != null && Instant.now().isBefore(info.blockedUntil)) {
            return false;
        }

        // If block period has expired, reset
        if (info.blockedUntil != null && Instant.now().isAfter(info.blockedUntil)) {
            attempts.remove(key);
            return true;
        }

        // If window expired, reset
        if (Instant.now().isAfter(info.windowStart.plusSeconds(WINDOW_SECONDS))) {
            attempts.remove(key);
            return true;
        }

        return info.count.get() < MAX_ATTEMPTS;
    }

    /**
     * Record a failed login attempt for the given key.
     */
    public void recordFailedAttempt(String key) {
        AttemptInfo info = attempts.computeIfAbsent(key,
                k -> new AttemptInfo(Instant.now(), new AtomicInteger(0), null));

        // Reset window if expired
        if (Instant.now().isAfter(info.windowStart.plusSeconds(WINDOW_SECONDS))) {
            info.windowStart = Instant.now();
            info.count.set(0);
        }

        int count = info.count.incrementAndGet();
        if (count >= MAX_ATTEMPTS) {
            info.blockedUntil = Instant.now().plusSeconds(BLOCK_SECONDS);
            logger.warn("Rate limit exceeded for key '{}'. Blocked for {} seconds.", key, BLOCK_SECONDS);
        }
    }

    /**
     * Clear the attempts for a key after successful login.
     */
    public void recordSuccess(String key) {
        attempts.remove(key);
    }

    /**
     * Get remaining seconds until unblock. Returns 0 if not blocked.
     */
    public long getBlockSecondsRemaining(String key) {
        AttemptInfo info = attempts.get(key);
        if (info != null && info.blockedUntil != null && Instant.now().isBefore(info.blockedUntil)) {
            return java.time.Duration.between(Instant.now(), info.blockedUntil).getSeconds();
        }
        return 0;
    }

    /**
     * Periodically clean up expired entries to prevent memory leak.
     */
    private void cleanup() {
        Instant now = Instant.now();
        attempts.entrySet().removeIf(entry -> {
            AttemptInfo info = entry.getValue();
            // Remove if window expired and not blocked
            if (info.blockedUntil == null && now.isAfter(info.windowStart.plusSeconds(WINDOW_SECONDS * 2))) {
                return true;
            }
            // Remove if block has expired
            if (info.blockedUntil != null && now.isAfter(info.blockedUntil.plusSeconds(60))) {
                return true;
            }
            return false;
        });
    }

    private static class AttemptInfo {
        volatile Instant windowStart;
        final AtomicInteger count;
        volatile Instant blockedUntil;

        AttemptInfo(Instant windowStart, AtomicInteger count, Instant blockedUntil) {
            this.windowStart = windowStart;
            this.count = count;
            this.blockedUntil = blockedUntil;
        }
    }
}
