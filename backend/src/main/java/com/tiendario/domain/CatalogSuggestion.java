package com.tiendario.domain;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "catalog_suggestions")
public class CatalogSuggestion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long companyId;

    private String companyName; // Para facilitar la vista en el admin

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_product_id")
    private CatalogProduct catalogProduct;

    private String suggestedName;

    @Column(columnDefinition = "TEXT")
    private String suggestedDescription;

    private String suggestedImageUrl;

    @Enumerated(EnumType.STRING)
    private SuggestionStatus status = SuggestionStatus.PENDING;

    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();
}
