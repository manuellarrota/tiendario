package com.tiendario.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendSimpleMessage(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("noreply@tiendario.com");
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    public void sendHtmlMessage(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom("noreply@tiendario.com");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        mailSender.send(message);
    }

    public void sendVerificationEmail(String email, String code) {
        String verificationUrl = "http://localhost:8081/verify?code=" + code;
        String subject = "Verifica tu cuenta en Tiendario";
        String content = "Hola,\n\nGracias por registrarte. Por favor haz clic en el siguiente enlace para activar tu cuenta:\n\n"
                + verificationUrl + "\n\nSi no te has registrado, puedes ignorar este correo.";

        try {
            sendSimpleMessage(email, subject, content);
        } catch (Exception e) {
            // Fallback: Write to file if mail server is not configured
        }

        // Always write to file for easy local testing without a real SMTP server
        try (java.io.FileWriter fw = new java.io.FileWriter("verification_links.txt", true);
                java.io.PrintWriter pw = new java.io.PrintWriter(fw)) {
            pw.println("Email: " + email + " | Link: " + verificationUrl);
        } catch (java.io.IOException e) {
            e.printStackTrace();
        }
    }
}
