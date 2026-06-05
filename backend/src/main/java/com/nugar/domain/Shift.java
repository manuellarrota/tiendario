package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "shifts")
public class Shift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private User user;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Company company;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cash_register_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private CashRegister cashRegister;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private ShiftStatus status;

    // Opening
    private BigDecimal initialCash;

    // Closing - Reported by Cashier (Blind closing)
    private BigDecimal reportedCash;
    private BigDecimal reportedCard;
    private BigDecimal reportedTransfer;
    private BigDecimal reportedMobile;

    // System Calculated (Expected)
    private BigDecimal expectedCash;
    private BigDecimal expectedCard;
    private BigDecimal expectedTransfer;
    private BigDecimal expectedMobile;

    // Total change returned to customers (vueltos en efectivo)
    private BigDecimal totalChangeGiven = BigDecimal.ZERO;

    // Refunded (Egresos)
    private BigDecimal refundedCash = BigDecimal.ZERO;
    private BigDecimal refundedCard = BigDecimal.ZERO;
    private BigDecimal refundedTransfer = BigDecimal.ZERO;
    private BigDecimal refundedMobile = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String observation;

    @OneToMany(mappedBy = "shift", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ShiftDeclaration> declarations = new java.util.ArrayList<>();

    // Cash Movements (Injections and Bleedings)
    private BigDecimal totalCashInjections = BigDecimal.ZERO;
    private BigDecimal totalCashBleedings = BigDecimal.ZERO;

    @OneToMany(mappedBy = "shift", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<CashMovement> cashMovements = new java.util.ArrayList<>();
}
