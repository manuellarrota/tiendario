package com.tiendario.domain;

import lombok.Data;
import javax.persistence.*;
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
    private User user;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

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

    @Column(columnDefinition = "TEXT")
    private String observation;
}
