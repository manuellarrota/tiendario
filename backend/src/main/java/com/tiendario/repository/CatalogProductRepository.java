package com.tiendario.repository;

import com.tiendario.domain.CatalogProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CatalogProductRepository extends JpaRepository<CatalogProduct, Long> {
    Optional<CatalogProduct> findBySku(String sku);
}
