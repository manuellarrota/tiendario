package com.nugar.web;

import com.nugar.domain.Company;
import com.nugar.domain.SubscriptionPayment;
import com.nugar.domain.PaymentStatus;
import com.nugar.domain.SubscriptionStatus; // Added import
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.GlobalConfigRepository;
import com.nugar.domain.GlobalConfig;
import com.nugar.repository.SubscriptionPaymentRepository;
import com.nugar.security.UserDetailsImpl;
import com.nugar.payload.response.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.math.BigDecimal; // Added import
import java.time.LocalDateTime; // Added import

@RestController
@RequestMapping("/api/payments")
public class SubscriptionPaymentController {

    @Autowired
    SubscriptionPaymentRepository paymentRepository;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    GlobalConfigRepository globalConfigRepository;

    @PostMapping("/submit")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> submitPayment(@RequestBody SubscriptionPayment payment) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Company company = companyRepository.findById(userDetails.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

        if ("EXTRA_REGISTER".equalsIgnoreCase(payment.getPaymentType())) {
            GlobalConfig config = globalConfigRepository.findFirstByOrderByIdAsc().orElse(new GlobalConfig());
            BigDecimal price = config.getExtraRegisterMonthlyPrice() != null ? config.getExtraRegisterMonthlyPrice() : new BigDecimal("5.00");
            int requested = payment.getRequestedExtraRegisters() != null ? payment.getRequestedExtraRegisters() : 1;
            BigDecimal expected = price.multiply(new BigDecimal(requested));
            
            // Allow small rounding differences, but generally it should match
            if (payment.getAmount().compareTo(expected) < 0) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: El monto ingresado ($" + payment.getAmount() + ") no coincide con el costo de las cajas solicitadas ($" + expected + ")."));
            }
        } else if ("SUBSCRIPTION_AND_REGISTERS".equalsIgnoreCase(payment.getPaymentType())) {
            GlobalConfig config = globalConfigRepository.findFirstByOrderByIdAsc().orElse(new GlobalConfig());
            BigDecimal extraPrice = config.getExtraRegisterMonthlyPrice() != null ? config.getExtraRegisterMonthlyPrice() : new BigDecimal("5.00");
            BigDecimal planPrice = config.getPremiumPlanMonthlyPrice() != null ? config.getPremiumPlanMonthlyPrice() : new BigDecimal("20.00");
            if ("ANNUAL".equalsIgnoreCase(payment.getBillingCycle())) {
                planPrice = planPrice.multiply(new BigDecimal("10")); // Assuming 10 months for annual
                extraPrice = extraPrice.multiply(new BigDecimal("10"));
            }
            int activeExtra = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
            BigDecimal expected = planPrice.add(extraPrice.multiply(new BigDecimal(activeExtra)));
            
            if (payment.getAmount().compareTo(expected.multiply(new BigDecimal("0.9"))) < 0) { // Give 10% leeway for discounts
                return ResponseEntity.badRequest().body(new MessageResponse("Error: El monto ingresado ($" + payment.getAmount() + ") es menor al costo del plan y las cajas ($" + expected + ")."));
            }
        }

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
