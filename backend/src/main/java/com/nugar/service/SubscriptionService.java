package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.SubscriptionPayment;
import com.nugar.domain.PaymentStatus;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.SubscriptionPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Servicio de gestion de suscripciones de Nugar.
 *
 * MODELO DE PRECIOS:
 *   Periodo de Prueba (TRIAL): 30 dias al registrarse, acceso completo.
 *   Plan Premium Mensual: $20/mes  → aprobacion extiende 30 dias.
 *   Plan Premium Anual:  $200/ano → aprobacion debe extender 365 dias
 *                                    (TODO: automatizar via campo billingCycle).
 *
 * El Super Admin aprueba pagos manualmente desde el panel.
 * No existe un plan FREE permanente ni un plan Starter.
 */
@Service
public class SubscriptionService {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SubscriptionPaymentRepository paymentRepository;

    @Transactional
    public void approvePayment(Long paymentId) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Payment is not in PENDING status");
        }

        payment.setStatus(PaymentStatus.APPROVED);
        paymentRepository.save(payment);

        Company company = payment.getCompany();
        company.setSubscriptionStatus(SubscriptionStatus.PAID);

        // Extend subscription by 30 days
        LocalDateTime currentEnd = company.getSubscriptionEndDate();
        if (currentEnd == null || currentEnd.isBefore(LocalDateTime.now())) {
            company.setSubscriptionEndDate(LocalDateTime.now().plusDays(30));
        } else {
            company.setSubscriptionEndDate(currentEnd.plusDays(30));
        }

        companyRepository.save(company);
    }

    @Transactional
    public void rejectPayment(Long paymentId, String reason) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        payment.setStatus(PaymentStatus.REJECTED);
        payment.setNotes(reason);
        paymentRepository.save(payment);
    }
}
