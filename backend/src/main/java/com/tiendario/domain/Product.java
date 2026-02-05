package com.tiendario.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import javax.persistence.*;
import java.math.BigDecimal;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Data
@Entity
@Table(name = "products", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "sku", "company_id" })
})
@Document(indexName = "products")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Column
    @Field(type = FieldType.Keyword)
    private String sku; // Barcode

    @Field(type = FieldType.Double)
    private BigDecimal price;
    private BigDecimal costPrice;

    @Field(type = FieldType.Integer)
    private Integer stock;
    private Integer minStock; // For alerts

    private String imageUrl;

    @Field(type = FieldType.Keyword)
    private String variant;

    @Field(type = FieldType.Keyword)
    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "catalog_product_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private CatalogProduct catalogProduct;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id")
    private Company company;

    // Helper methods to get info from catalog if available
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getDisplayName() {
        return catalogProduct != null ? catalogProduct.getName() : name;
    }
}
