package com.tiendario.service;

import com.tiendario.domain.Company;
import com.tiendario.domain.SubscriptionPayment;
import com.tiendario.domain.PaymentStatus;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
