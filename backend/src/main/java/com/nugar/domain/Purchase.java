package com.nugar.domain;

import lombok.Data;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "purchases")
public class Purchase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime date;
    private BigDecimal total;
    private String invoiceNumber; // Optional invoice ID from supplier

    // Multi-currency fields
    private String currencyCode = "USD";
    private BigDecimal exchangeRate = BigDecimal.ONE;
    private BigDecimal totalInBaseCurrency;

    // Discount fields
    private BigDecimal globalDiscountAmount;
    
    @Enumerated(EnumType.STRING)
    private DiscountType globalDiscountType;
    
    private BigDecimal totalDiscount;
    
    @Enumerated(EnumType.STRING)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Enumerated(EnumType.STRING)
    private PurchaseStatus status = PurchaseStatus.COMPLETED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "purchases" })
    private Company company;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "purchase" })
    private List<PurchaseItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "purchase" })
    private List<PurchaseAdjustment> adjustments = new ArrayList<>();

    // Transitorio para obtener el total final
    @Transient
    public BigDecimal getAdjustedTotal() {
        if (total == null) return BigDecimal.ZERO;
        BigDecimal adjusted = total;
        if (adjustments != null) {
            for (PurchaseAdjustment adj : adjustments) {
                if (adj.getAmount() != null) {
                    if (adj.getType() == AdjustmentType.DEBIT_NOTE) {
                        adjusted = adjusted.add(adj.getAmount());
                    } else if (adj.getType() == AdjustmentType.CREDIT_NOTE) {
                        adjusted = adjusted.subtract(adj.getAmount());
                    }
                }
            }
        }
        return adjusted;
    }
}
