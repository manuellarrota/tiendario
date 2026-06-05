package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "cash_movements")
public class CashMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id", nullable = false)
    @JsonIgnore
    private Shift shift;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementType type;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currencyCode;

    // Optional: The exchange rate to base currency at the time of movement
    @Column(precision = 19, scale = 4)
    private BigDecimal exchangeRate = BigDecimal.ONE;

    @Column(precision = 19, scale = 4)
    private BigDecimal amountInBaseCurrency;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum MovementType {
        INJECTION, // Ingreso (ej. fondo, cambio)
        BLEEDING   // Egreso/Sangría (ej. retiro de exceso, transferencia)
    }
}
