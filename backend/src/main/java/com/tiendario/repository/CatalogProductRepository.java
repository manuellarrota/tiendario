package com.tiendario.repository;

import com.tiendario.domain.CatalogProduct;
import org.springframework.data.jpa.repository.JpaRepository;


public interface CatalogProductRepository extends JpaRepository<CatalogProduct, Long> {
    java.util.Optional<CatalogProduct> findBySku(String sku);

    java.util.List<CatalogProduct> findByNameContainingIgnoreCase(String name);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM CatalogProduct c WHERE " +
            "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(c.name), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(c.sku) LIKE CONCAT('%', :q, '%')")
    java.util.List<CatalogProduct> searchCatalog(@org.springframework.data.repository.query.Param("q") String q);
}
