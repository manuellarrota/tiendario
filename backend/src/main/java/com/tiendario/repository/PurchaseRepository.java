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
           "AND (CAST(:searchTerm AS string) IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(p.invoiceNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "AND (CAST(:dateFrom AS string) IS NULL OR p.date >= :dateFrom) " +
           "AND (CAST(:dateTo AS string) IS NULL OR p.date <= :dateTo) " +
           "AND (CAST(:paymentMethod AS string) IS NULL OR p.paymentMethod = :paymentMethod) " +
           "ORDER BY p.date DESC")
    Page<Purchase> findByFilters(
        @Param("companyId") Long companyId,
        @Param("searchTerm") String searchTerm,
        @Param("dateFrom") LocalDateTime dateFrom,
        @Param("dateTo") LocalDateTime dateTo,
        @Param("paymentMethod") String paymentMethod,
        Pageable pageable
    );
}
