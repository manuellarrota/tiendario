package com.nugar.service;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;


import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Autowired;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${app.mail.from:noreply@nugar.com}")
    private String fromAddress;

    @Value("${app.frontend.url:http://localhost:8081}")
    private String frontendUrl;

    @Value("${app.market.url:http://localhost:8082}")
    private String marketUrl;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    /**
     * Send a simple plain-text email.
     */
    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            if (mailSender == null) {
                log.warn("[EMAIL] JavaMailSender not configured. Skipping email to {}. Falling back to file log.", to);
                writeToFallbackFile("emails_fallback.txt", "TO: " + to + " | SUBJECT: " + subject + " | BODY: " + text);
                return;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            log.info("[EMAIL] Email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("[EMAIL] Could not send email to {}: {}. Falling back to file log.", to, e.getMessage());
            writeToFallbackFile("emails_fallback.txt",
                    "TO: " + to + " | SUBJECT: " + subject + " | BODY: " + text);
        }
    }

    /**
     * Send an HTML-formatted email.
     */
    public void sendHtmlMessage(String to, String subject, String htmlContent) {
        try {
            if (mailSender == null) {
                log.warn("[EMAIL] JavaMailSender not configured. Skipping HTML email to {}. Falling back to file log.", to);
                writeToFallbackFile("emails_fallback.txt",
                        "TO: " + to + " | SUBJECT: " + subject + " | HTML: (logged)");
                return;
            }
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("[EMAIL] HTML email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("[EMAIL] Could not send HTML email to {}: {}. Falling back to file log.", to, e.getMessage());
            writeToFallbackFile("emails_fallback.txt",
                    "TO: " + to + " | SUBJECT: " + subject + " | HTML: (logged)");
        }
    }

    /**
     * Send password reset email with a branded HTML template.
     */
    public void sendPasswordResetEmail(String to, String username, String resetToken, String customFrontendUrl) {
        String base = (customFrontendUrl != null && !customFrontendUrl.isBlank()) ? customFrontendUrl : frontendUrl;
        String resetLink = base + "/reset-password?token=" + resetToken;
        String subject = "🔐 Restablecer tu contraseña — Nugar";
        
        Context context = new Context();
        context.setVariable("username", username);
        context.setVariable("resetLink", resetLink);
        String html = templateEngine.process("emails/password-reset", context);

        sendHtmlMessage(to, subject, html);

        // Also log for local dev convenience
        writeToFallbackFile("password_reset_links.txt",
                "User: " + username + " | Email: " + to + " | Link: " + resetLink);
    }

    /**
     * Notify a store owner that a new order has been placed.
     */
    @Async
    public void sendNewOrderNotification(String storeEmail, String storeName,
            String customerName, String orderSummary, java.math.BigDecimal total) {
        String subject = "🛒 ¡Nueva orden recibida! — " + storeName;

        Context context = new Context();
        context.setVariable("storeName", storeName);
        context.setVariable("customerName", customerName);
        context.setVariable("orderSummary", orderSummary);
        context.setVariable("total", total != null ? total.setScale(2, java.math.RoundingMode.HALF_UP).toString() : "0.00");
        String orderUrl = frontendUrl + "/sales/history";
        context.setVariable("orderUrl", orderUrl);
        String html = templateEngine.process("emails/new-order", context);

        sendHtmlMessage(storeEmail, subject, html);
    }

    /**
     * Notify a customer that their order status has changed.
     */
    @Async
    public void sendOrderStatusUpdateEmail(String customerEmail, String customerName,
            String storeName, String newStatus, String orderId) {
        String statusText;
        String emoji;
        switch (newStatus) {
            case "READY_FOR_PICKUP":
                statusText = "Lista para Retirar";
                emoji = "📦";
                break;
            case "PAID":
                statusText = "Completada y Pagada";
                emoji = "✅";
                break;
            case "CANCELLED":
                statusText = "Cancelada";
                emoji = "❌";
                break;
            default:
                statusText = newStatus;
                emoji = "📋";
        }

        String subject = emoji + " Tu pedido #" + orderId + " — " + statusText;

        Context context = new Context();
        context.setVariable("customerName", customerName);
        context.setVariable("storeName", storeName);
        context.setVariable("statusText", statusText);
        context.setVariable("emoji", emoji);
        context.setVariable("orderId", orderId);
        String orderUrl = marketUrl + "/dashboard";
        context.setVariable("orderUrl", orderUrl);
        String html = templateEngine.process("emails/order-status", context);

        sendHtmlMessage(customerEmail, subject, html);
    }

    /**
     * Send subscription warning email 3 days before expiration.
     */
    public void sendSubscriptionWarningEmail(String to, String storeName, String expirationDate) {
        String subject = "⏳ Tu suscripción a Nugar vence pronto";
        
        Context context = new Context();
        context.setVariable("storeName", storeName);
        context.setVariable("expirationDate", expirationDate);

        String billingUrl = frontendUrl + "/company";
        context.setVariable("billingUrl", billingUrl);

        String html = templateEngine.process("emails/subscription-warning", context);
        sendHtmlMessage(to, subject, html);
    }

    /**
     * Send account verification email after registration.
     */
    public void sendVerificationEmail(String email, String code, String customBackendUrl) {
        String base = (customBackendUrl != null && !customBackendUrl.isBlank()) ? customBackendUrl : backendUrl;
        String verificationUrl = base + "/api/auth/verify?code=" + code;
        String subject = "✉️ Verifica tu cuenta — Nugar";

        Context context = new Context();
        context.setVariable("verificationUrl", verificationUrl);
        String html = templateEngine.process("emails/verify-account", context);

        sendHtmlMessage(email, subject, html);

        // Always write to file for easy local testing without a real SMTP server
        writeToFallbackFile("verification_links.txt",
                "Email: " + email + " | Link: " + verificationUrl);
    }

    /**
     * Send credentials email when SuperAdmin registers a new store.
     */
    @Async
    public void sendStoreCredentials(String to, String storeName, String username, String password) {
        String subject = "🚀 ¡Bienvenido a Nugar! — Credenciales de " + storeName;
        String adminUrl = frontendUrl + "/admin";

        Context context = new Context();
        context.setVariable("storeName", storeName);
        context.setVariable("username", username);
        context.setVariable("password", password);
        context.setVariable("adminUrl", adminUrl);
        String html = templateEngine.process("emails/store-credentials", context);

        sendHtmlMessage(to, subject, html);
    }

    // ─── Utility Methods ───────────────────────────────────────────────

    private void writeToFallbackFile(String filename, String content) {
        try {
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of(filename),
                    "[" + java.time.LocalDateTime.now() + "] " + content + "\n",
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception e) {
            log.error("[EMAIL_FALLBACK] Could not write to fallback file {}: {}", filename, e.getMessage());
        }
    }
}
