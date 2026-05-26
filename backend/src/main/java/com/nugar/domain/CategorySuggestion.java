package com.nugar.domain;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "category_suggestions")
public class CategorySuggestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id")
    private Long storeId;

    private String name;

    @Enumerated(EnumType.STRING)
    private SuggestionStatus status = SuggestionStatus.PENDING;
}
