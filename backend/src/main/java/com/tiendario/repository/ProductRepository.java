package com.tiendario.repository;

import com.tiendario.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCompanyId(Long companyId);

    Long countByCompanyId(Long companyId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.company.id = :companyId AND p.stock <= p.minStock")
    Long countLowStockByCompanyId(@Param("companyId") Long companyId);

    Boolean existsBySkuAndCompanyId(String sku, Long companyId);

    List<Product> findBySku(String sku);

    List<Product> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String name, String description);
}
