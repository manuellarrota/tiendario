package com.tiendario.repository;

import com.tiendario.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCompanyId(Long companyId);

    Page<Product> findByCompanyId(Long companyId, Pageable pageable);

    Long countByCompanyId(Long companyId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.company.id = :companyId AND p.stock <= p.minStock")
    Long countLowStockByCompanyId(@Param("companyId") Long companyId);

    Boolean existsBySkuAndCompanyId(String sku, Long companyId);

    java.util.Optional<Product> findBySkuAndCompanyId(String sku, Long companyId);

    List<Product> findBySku(String sku);

    java.util.Optional<Product> findByBarcodeAndCompanyId(String barcode, Long companyId);

    List<Product> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String name, String description);

    @Query("SELECT p FROM Product p WHERE p.company.id = :companyId AND " +
            "(:onlyLowStock = false OR p.stock <= p.minStock) AND (" +
            "LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(p.sku) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
            "LOWER(p.brand) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Product> findByCompanyIdAndSearch(@Param("companyId") Long companyId, 
                                          @Param("q") String q, 
                                          @Param("onlyLowStock") boolean onlyLowStock, 
                                          Pageable pageable);

    long countByCategory(String category);
}
