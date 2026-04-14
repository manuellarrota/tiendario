package com.tiendario.service;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;


import javax.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Autowired;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@tiendario.com}")
    private String fromAddress;

    @Value("${app.frontend.url:http://localhost:8081}")
    private String frontendUrl;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    /**
     * Send a simple plain-text email.
     */
    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            if (mailSender == null) {
                log.warn("JavaMailSender not configured. Skipping email to {}. Falling back to file log.", to);
                writeToFallbackFile("emails_fallback.txt", "TO: " + to + " | SUBJECT: " + subject + " | BODY: " + text);
                return;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            log.info("Email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("Could not send email to {}: {}. Falling back to file log.", to, e.getMessage());
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
                log.warn("JavaMailSender not configured. Skipping HTML email to {}. Falling back to file log.", to);
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
            log.info("HTML email sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("Could not send HTML email to {}: {}. Falling back to file log.", to, e.getMessage());
            writeToFallbackFile("emails_fallback.txt",
                    "TO: " + to + " | SUBJECT: " + subject + " | HTML: (logged)");
        }
    }

    /**
     * Send password reset email with a branded HTML template.
     */
    public void sendPasswordResetEmail(String to, String username, String resetToken) {
        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        String subject = "🔐 Restablecer tu contraseña — Tiendario";
        String html = buildPasswordResetHtml(username, resetLink);

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
            String customerName, String orderSummary, double total) {
        String subject = "🛒 ¡Nueva orden recibida! — " + storeName;
        String html = buildNewOrderHtml(storeName, customerName, orderSummary, total);
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
        String html = buildOrderStatusHtml(customerName, storeName, statusText, emoji, orderId);
        sendHtmlMessage(customerEmail, subject, html);
    }

    /**
     * Send account verification email after registration.
     */
    public void sendVerificationEmail(String email, String code) {
        String verificationUrl = backendUrl + "/api/auth/verify?code=" + code;
        String subject = "✉️ Verifica tu cuenta — Tiendario";
        String html = "<!DOCTYPE html><html><body style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<div style='background:linear-gradient(135deg,#059669,#10b981);padding:40px;border-radius:16px;text-align:center;color:white;'>"
                + "<h1 style='margin:0 0 10px;font-size:28px;'>✉️ Verifica tu Cuenta</h1>"
                + "<p style='opacity:0.9;margin:0;'>Tiendario — Tu Marketplace Local</p>"
                + "</div>"
                + "<div style='padding:30px;background:#fafafa;border-radius:0 0 16px 16px;'>"
                + "<p>¡Bienvenido a Tiendario!</p>"
                + "<p>Haz clic en el siguiente botón para activar tu cuenta:</p>"
                + "<div style='text-align:center;margin:30px 0;'>"
                + "<a href='" + verificationUrl
                + "' style='background:#059669;color:white;padding:16px 40px;border-radius:30px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;'>Verificar Cuenta</a>"
                + "</div>"
                + "<p style='color:#6b7280;font-size:14px;'>Si no te has registrado, puedes ignorar este correo.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'/>"
                + "<p style='color:#9ca3af;font-size:12px;text-align:center;'>© Tiendario — San Cristóbal, Táchira</p>"
                + "</div></body></html>";

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
        String subject = "🚀 ¡Bienvenido a Tiendario! — Credenciales de " + storeName;
        String html = buildStoreCredentialsHtml(storeName, username, password);
        sendHtmlMessage(to, subject, html);
    }

    // ─── HTML Templates ───────────────────────────────────────────────

    private String buildPasswordResetHtml(String username, String resetLink) {
        return "<!DOCTYPE html><html><body style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<div style='background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;border-radius:16px;text-align:center;color:white;'>"
                + "<h1 style='margin:0 0 10px;font-size:28px;'>🔐 Restablecer Contraseña</h1>"
                + "<p style='opacity:0.9;margin:0;'>Tiendario — Tu Marketplace Local</p>"
                + "</div>"
                + "<div style='padding:30px;background:#fafafa;border-radius:0 0 16px 16px;'>"
                + "<p>Hola <strong>" + username + "</strong>,</p>"
                + "<p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva:</p>"
                + "<div style='text-align:center;margin:30px 0;'>"
                + "<a href='" + resetLink
                + "' style='background:#6366f1;color:white;padding:16px 40px;border-radius:30px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;'>Restablecer Contraseña</a>"
                + "</div>"
                + "<p style='color:#6b7280;font-size:14px;'>Este enlace expira en <strong>30 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo sin problemas.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'/>"
                + "<p style='color:#9ca3af;font-size:12px;text-align:center;'>© Tiendario — San Cristóbal, Táchira, Venezuela</p>"
                + "</div></body></html>";
    }

    private String buildStoreCredentialsHtml(String storeName, String username, String password) {
        String adminUrl = frontendUrl + "/admin";
        return "<!DOCTYPE html><html><body style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<div style='background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;border-radius:16px;text-align:center;color:white;'>"
                + "<h1 style='margin:0 0 10px;font-size:28px;'>🚀 ¡Bienvenido a Tiendario!</h1>"
                + "<p style='opacity:0.9;margin:0;'>Tu tienda " + storeName + " ha sido registrada</p>"
                + "</div>"
                + "<div style='padding:30px;background:#fafafa;border-radius:0 0 16px 16px;'>"
                + "<p>¡Felicidades! Se ha creado la cuenta de administración para <strong>" + storeName
                + "</strong>.</p>"
                + "<div style='background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;'>"
                + "<p style='margin:0 0 10px;color:#374151;'><strong>Usuario:</strong> <code style='background:#f3f4f6;padding:2px 6px;border-radius:4px;'>"
                + username + "</code></p>"
                + "<p style='margin:0;color:#374151;'><strong>Contraseña:</strong> <code style='background:#f3f4f6;padding:2px 6px;border-radius:4px;'>"
                + password + "</code></p>"
                + "</div>"
                + "<div style='text-align:center;margin:30px 0;'>"
                + "<a href='" + adminUrl
                + "' style='background:#6366f1;color:white;padding:16px 40px;border-radius:30px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px;'>Ingresar al Panel</a>"
                + "</div>"
                + "<p style='color:#6b7280;font-size:14px;'>Te recomendamos cambiar tu contraseña al ingresar por primera vez desde Configuraciones.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'/>"
                + "<p style='color:#9ca3af;font-size:12px;text-align:center;'>© Tiendario — Tu Marketplace Local</p>"
                + "</div></body></html>";
    }

    private String buildNewOrderHtml(String storeName, String customerName,
            String orderSummary, double total) {
        return "<!DOCTYPE html><html><body style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<div style='background:linear-gradient(135deg,#059669,#10b981);padding:40px;border-radius:16px;text-align:center;color:white;'>"
                + "<h1 style='margin:0 0 10px;font-size:28px;'>🛒 ¡Nueva Orden!</h1>"
                + "<p style='opacity:0.9;margin:0;'>" + storeName + "</p>"
                + "</div>"
                + "<div style='padding:30px;background:#fafafa;border-radius:0 0 16px 16px;'>"
                + "<p>Un nuevo pedido ha llegado de <strong>" + customerName + "</strong>.</p>"
                + "<div style='background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;'>"
                + "<h3 style='margin:0 0 10px;'>📋 Detalle del Pedido</h3>"
                + "<p style='white-space:pre-line;color:#374151;'>" + orderSummary + "</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;'/>"
                + "<p style='font-size:18px;font-weight:bold;color:#059669;'>Total: $" + String.format("%.2f", total)
                + "</p>"
                + "</div>"
                + "<p style='color:#6b7280;font-size:14px;'>Ingresa al <strong>Panel de Administración</strong> para gestionar esta orden.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'/>"
                + "<p style='color:#9ca3af;font-size:12px;text-align:center;'>© Tiendario — Marketplace Local</p>"
                + "</div></body></html>";
    }

    private String buildOrderStatusHtml(String customerName, String storeName,
            String statusText, String emoji, String orderId) {
        return "<!DOCTYPE html><html><body style='font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<div style='background:linear-gradient(135deg,#3b82f6,#6366f1);padding:40px;border-radius:16px;text-align:center;color:white;'>"
                + "<h1 style='margin:0 0 10px;font-size:28px;'>" + emoji + " Actualización de Pedido</h1>"
                + "<p style='opacity:0.9;margin:0;'>Pedido #" + orderId + "</p>"
                + "</div>"
                + "<div style='padding:30px;background:#fafafa;border-radius:0 0 16px 16px;'>"
                + "<p>Hola <strong>" + customerName + "</strong>,</p>"
                + "<p>Tu pedido en <strong>" + storeName + "</strong> ha sido actualizado:</p>"
                + "<div style='text-align:center;margin:20px 0;padding:20px;background:white;border-radius:12px;border:1px solid #e5e7eb;'>"
                + "<p style='font-size:24px;margin:0 0 5px;'>" + emoji + "</p>"
                + "<p style='font-size:18px;font-weight:bold;margin:0;color:#374151;'>" + statusText + "</p>"
                + "</div>"
                + "<p style='color:#6b7280;font-size:14px;'>Puedes ver el estado de todos tus pedidos desde tu <strong>Panel de Cliente</strong>.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:20px 0;'/>"
                + "<p style='color:#9ca3af;font-size:12px;text-align:center;'>© Tiendario — San Cristóbal, Táchira</p>"
                + "</div></body></html>";
    }

    private void writeToFallbackFile(String filename, String content) {
        try {
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of(filename),
                    "[" + java.time.LocalDateTime.now() + "] " + content + "\n",
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception e) {
            log.error("Could not write to fallback file {}: {}", filename, e.getMessage());
        }
    }
}
