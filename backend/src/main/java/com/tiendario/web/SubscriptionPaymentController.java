package com.tiendario.web;

import com.tiendario.domain.Company;
import com.tiendario.domain.SubscriptionPayment;
import com.tiendario.domain.PaymentStatus;
import com.tiendario.domain.SubscriptionStatus; // Added import
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.payload.response.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.math.BigDecimal; // Added import
import java.time.LocalDateTime; // Added import

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
public class SubscriptionPaymentController {

    @Autowired
    SubscriptionPaymentRepository paymentRepository;

    @Autowired
    CompanyRepository companyRepository;

    @PostMapping("/submit")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> submitPayment(@RequestBody SubscriptionPayment payment) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Company company = companyRepository.findById(userDetails.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

        payment.setCompany(company);
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        return ResponseEntity.ok(new MessageResponse("Comprobante de pago enviado correctamente. En revisión."));
    }

    @GetMapping("/my-payments")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getMyPayments() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        List<SubscriptionPayment> payments = paymentRepository.findByCompanyId(userDetails.getCompanyId());
        return ResponseEntity.ok(payments);
    }

    @PostMapping("/simulate-success")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> simulatePaymentSuccess() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Company company = companyRepository.findById(userDetails.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

        // Simulate logic usually done by Admin
        company.setSubscriptionStatus(SubscriptionStatus.PAID);

        LocalDateTime currentEnd = company.getSubscriptionEndDate();
        if (currentEnd == null || currentEnd.isBefore(LocalDateTime.now())) {
            company.setSubscriptionEndDate(LocalDateTime.now().plusDays(30));
        } else {
            company.setSubscriptionEndDate(currentEnd.plusDays(30));
        }

        companyRepository.save(company);

        // Record a fake approved payment for history
        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setCompany(company);
        payment.setAmount(new BigDecimal("29.99"));
        payment.setPaymentMethod("Credit Card (Simulated)");
        payment.setReference("SIM-" + System.currentTimeMillis());
        payment.setStatus(PaymentStatus.APPROVED);
        paymentRepository.save(payment);

        return ResponseEntity.ok(new MessageResponse("Payment validated! Subscription activated."));
    }
}
