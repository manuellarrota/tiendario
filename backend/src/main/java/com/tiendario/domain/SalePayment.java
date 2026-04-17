package com.tiendario.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "sale_payments")
public class SalePayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    @JsonIgnore
    private Sale sale;

    private BigDecimal amount; // Amount in the specific currency (e.g., 100.00 Bs)
    
    private String currencyCode; // e.g., "USD", "COP", "VES"
    
    private BigDecimal exchangeRate; // Rate at transaction time (e.g., 36.50)
    
    // Equivalent amount in base currency (USD) for easier totals
    private BigDecimal amountInBaseCurrency; 
    
    @Enumerated(EnumType.STRING)
    private PaymentMethod method;
    
    private String notes;
}
