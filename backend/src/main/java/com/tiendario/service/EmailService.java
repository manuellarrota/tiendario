package com.tiendario.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender emailSender;

    @Value("${spring.mail.username:noreply@tiendario.com}")
    private String fromEmail;

    public void sendVerificationEmail(String to, String code) {
        String verifyUrl = "http://localhost:8080/api/auth/verify?code=" + code;
        String subject = "Verifica tu cuenta en Tiendario";
        String text = "Hola,\n\nGracias por registrarte en Tiendario. Por favor verifica tu cuenta haciendo clic en el siguiente enlace:\n\n"
                + verifyUrl + "\n\nSi no te registraste, ignora este mensaje.";

        System.out.println("--------------------------------------------------");
        System.out.println("EMAIL SIMULATION (SMTP not configured or failed):");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Link: " + verifyUrl);
        System.out.println("--------------------------------------------------");

        if (emailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(text);
                emailSender.send(message);
                System.out.println("Email sent successfully to " + to);
            } catch (Exception e) {
                System.err.println("Failed to send email: " + e.getMessage());
            }
        }

        // Write to file for dev
        try (java.io.FileWriter fw = new java.io.FileWriter("verification_links.txt", true);
                java.io.BufferedWriter bw = new java.io.BufferedWriter(fw);
                java.io.PrintWriter out = new java.io.PrintWriter(bw)) {
            out.println("To: " + to + " | Link: " + verifyUrl);
        } catch (java.io.IOException e) {
            System.err.println("Failed to write verification link to file: " + e.getMessage());
        }
    }
}
