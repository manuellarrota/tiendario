package com.tiendario.domain;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "catalog_products", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "sku" })
})
public class CatalogProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @Column(unique = true)
    private String sku;

    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;
}
