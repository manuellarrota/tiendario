package com.tiendario.repository;

import com.tiendario.domain.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findByCompanyIdOrderByDateDesc(Long companyId);

    @Query("SELECT s FROM Sale s WHERE s.company.id = :companyId AND s.date >= :startOfDay")
    List<Sale> findByCompanyIdAndDateAfter(Long companyId, LocalDateTime startOfDay);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "items", "items.product",
            "items.product.company",
            "items.product.catalogProduct", "company", "customer", "customer.company" })
    List<Sale> findByCustomer_EmailOrderByDateDesc(String email);

    List<Sale> findByCompanyIdAndStatusOrderByDateDesc(Long companyId, com.tiendario.domain.SaleStatus status);

    @Query("SELECT COUNT(DISTINCT s.company.id) FROM Sale s WHERE s.date >= :sinceDate")
    Long countActiveCompaniesSince(LocalDateTime sinceDate);

    long countByCompanyIdAndStatus(Long companyId, com.tiendario.domain.SaleStatus status);

    List<Sale> findByCompanyIdAndDateBetween(Long companyId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT si.product.name, SUM(si.quantity) as totalSold " +
            "FROM SaleItem si " +
            "WHERE si.sale.company.id = :companyId " +
            "GROUP BY si.product.name " +
            "ORDER BY totalSold DESC")
    List<Object[]> findTopSellingProductsByCompany(Long companyId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT DISTINCT s.company.id FROM Sale s WHERE s.date >= :sinceDate")
    List<Long> findUniqueCompanyIdsSince(LocalDateTime sinceDate);
}
