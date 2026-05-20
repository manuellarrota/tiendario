package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import javax.persistence.*;
import java.math.BigDecimal;

@Entity
@Data
@Table(name = "shift_declarations")
public class ShiftDeclaration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    @JsonIgnore
    private Shift shift;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    @Column(nullable = false)
    private String currencyCode;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal declaredAmount;

    // Optional: The exchange rate to base currency at the time of closing
    @Column(precision = 19, scale = 4)
    private BigDecimal exchangeRate;
    
    // Optional: The converted amount in base currency for easier expected vs reported comparisons
    @Column(precision = 19, scale = 4)
    private BigDecimal amountInBaseCurrency;

    @Column(nullable = false)
    private String declarationType = "CLOSING"; // "OPENING" or "CLOSING"
}
