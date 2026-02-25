package com.tiendario.repository;

import com.tiendario.domain.CatalogProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

public interface CatalogProductRepository extends JpaRepository<CatalogProduct, Long> {
    java.util.Optional<CatalogProduct> findBySku(String sku);

    java.util.List<CatalogProduct> findByNameContainingIgnoreCase(String name);
}
