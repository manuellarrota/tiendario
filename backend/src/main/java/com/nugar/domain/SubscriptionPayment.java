package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "subscription_payments")
public class SubscriptionPayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Company company;

    private BigDecimal amount;
    private String paymentMethod; // e.g., "Zelle", "PayPal", "Transferencia VES"
    private String reference;
    private String proofImageUrl;
    private String notes;
    private String billingCycle; // "MONTHLY" or "ANNUAL"
    private String targetPlan;   // "BASIC", "MEDIUM" or "PREMIUM" — the plan being paid for
    private String paymentType;  // "SUBSCRIPTION" or "EXTRA_REGISTER"
    private Integer requestedExtraRegisters;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;
    
    private String processedBy; // email or name of the admin who approved/rejected it

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = PaymentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
