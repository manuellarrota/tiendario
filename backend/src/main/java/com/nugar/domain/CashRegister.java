package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "cash_registers")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class CashRegister {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Company company;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CashRegisterStatus status = CashRegisterStatus.CLOSED;

    // We can store the current active shift here for convenience, but it's optional.
    // Given we enforce only one OPEN shift per cash register, we can query it easily.
}
