package com.tiendario.repository;

import com.tiendario.domain.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByCompanyIdOrderByDateDesc(Long companyId);

    Page<Purchase> findByCompanyId(Long companyId, Pageable pageable);

    @Query("SELECT p FROM Purchase p LEFT JOIN p.supplier s " +
           "WHERE p.company.id = :companyId " +
           "AND (:supplierName IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :supplierName, '%'))) " +
           "AND (:dateFrom IS NULL OR p.date >= :dateFrom) " +
           "AND (:dateTo IS NULL OR p.date <= :dateTo) " +
           "ORDER BY p.date DESC")
    Page<Purchase> findByFilters(
        @Param("companyId") Long companyId,
        @Param("supplierName") String supplierName,
        @Param("dateFrom") LocalDateTime dateFrom,
        @Param("dateTo") LocalDateTime dateTo,
        Pageable pageable
    );
}
