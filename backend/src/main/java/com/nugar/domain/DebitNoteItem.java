package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "debit_note_items")
@Data
@NoArgsConstructor
public class DebitNoteItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_note_id", nullable = false)
    @JsonIgnore
    private DebitNote debitNote;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantityReturned;

    @Column(nullable = false)
    private BigDecimal unitCost; // Cost at which it was purchased

    @Column(nullable = false)
    private BigDecimal refundAmount; // quantityReturned * unitCost
}
