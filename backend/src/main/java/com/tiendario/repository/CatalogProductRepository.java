package com.tiendario.repository;

import com.tiendario.domain.CatalogProduct;
import org.springframework.data.jpa.repository.JpaRepository;


public interface CatalogProductRepository extends JpaRepository<CatalogProduct, Long> {
    java.util.Optional<CatalogProduct> findBySku(String sku);

    java.util.List<CatalogProduct> findByNameContainingIgnoreCase(String name);
}
