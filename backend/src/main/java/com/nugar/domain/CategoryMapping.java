package com.nugar.domain;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "category_mappings", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "local_category_name" })
})
public class CategoryMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "local_category_name", nullable = false)
    private String localCategoryName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "global_category_id", nullable = false)
    private Category globalCategory;
}
