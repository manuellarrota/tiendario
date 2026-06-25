package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.SubscriptionPayment;
import com.nugar.domain.PaymentStatus;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.domain.SubscriptionPlan;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.SubscriptionPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nugar.service.CashRegisterService;
import java.time.LocalDateTime;

/**
 * Servicio de gestion de suscripciones de Nugar.
 *
 * MODELO DE PRECIOS:
 *   Periodo de Prueba (TRIAL): 30 dias al registrarse, acceso completo.
 *   Plan Premium Mensual: $20/mes  → aprobacion extiende 30 dias.
 *   Plan Premium Anual:  $200/ano → aprobacion extiende 365 dias.
 * El Super Admin aprueba pagos manualmente desde el panel.
 * No existe un plan FREE permanente ni un plan Starter.
 */
@Service
public class SubscriptionService {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SubscriptionPaymentRepository paymentRepository;

    @Autowired
    private CashRegisterService cashRegisterService;

    @Transactional
    public void approvePayment(Long paymentId, String adminEmail) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Payment is not in PENDING status");
        }

        payment.setStatus(PaymentStatus.APPROVED);
        payment.setProcessedBy(adminEmail);
        paymentRepository.save(payment);

        Company company = payment.getCompany();

        if ("EXTRA_REGISTER".equalsIgnoreCase(payment.getPaymentType())) {
            // It's a payment for extra registers only
            int requested = payment.getRequestedExtraRegisters() != null ? payment.getRequestedExtraRegisters() : 1;
            int currentExtra = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
            company.setExtraRegisters(currentExtra + requested);
            // We don't touch the subscription end date for pure extra register payments
            
            // Also ensure the status is PAID if they are paying for add-ons
            if (company.getSubscriptionStatus() != SubscriptionStatus.PAID) {
                company.setSubscriptionStatus(SubscriptionStatus.PAID);
            }
        } else {
            // It's a normal subscription payment (or mixed)
            company.setSubscriptionStatus(SubscriptionStatus.PAID);

            // Update the subscription plan if the payment specifies a target plan
            if (payment.getTargetPlan() != null && !payment.getTargetPlan().isBlank()) {
                try {
                    company.setSubscriptionPlan(SubscriptionPlan.valueOf(payment.getTargetPlan().toUpperCase()));
                } catch (IllegalArgumentException ignored) {
                    // Keep existing plan if targetPlan is not a valid enum value
                }
            }
            
            // Apply deferred reduction if exists
            if (company.getNextCycleExtraRegisters() != null) {
                company.setExtraRegisters(company.getNextCycleExtraRegisters());
                company.setNextCycleExtraRegisters(null);
            }

            // If it's pure SUBSCRIPTION and they requested extra registers, add them (Legacy behaviour)
            if ("SUBSCRIPTION".equalsIgnoreCase(payment.getPaymentType()) && payment.getRequestedExtraRegisters() != null && payment.getRequestedExtraRegisters() > 0) {
                int currentExtra = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
                company.setExtraRegisters(currentExtra + payment.getRequestedExtraRegisters());
            }

            // Reset billedExtraRegisters for the new cycle
            company.setBilledExtraRegisters(company.getExtraRegisters() != null ? company.getExtraRegisters() : 0);

            // Extend subscription based on billing cycle
            int daysToAdd = "ANNUAL".equalsIgnoreCase(payment.getBillingCycle()) ? 365 : 30;

            LocalDateTime currentEnd = company.getSubscriptionEndDate();
            if (currentEnd == null || currentEnd.isBefore(LocalDateTime.now())) {
                company.setSubscriptionEndDate(LocalDateTime.now().plusDays(daysToAdd));
            } else {
                company.setSubscriptionEndDate(currentEnd.plusDays(daysToAdd));
            }
        }

        companyRepository.save(company);
        cashRegisterService.provisionRegistersForCompany(company);
    }

    @Transactional
    public void rejectPayment(Long paymentId, String reason, String adminEmail) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        payment.setStatus(PaymentStatus.REJECTED);
        payment.setNotes(reason);
        payment.setProcessedBy(adminEmail);
        paymentRepository.save(payment);
    }
}
