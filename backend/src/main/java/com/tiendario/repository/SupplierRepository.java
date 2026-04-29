package com.tiendario.repository;

import com.tiendario.domain.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByCompanyId(Long companyId);
    Page<Supplier> findByCompanyId(Long companyId, Pageable pageable);

    @Query("SELECT s FROM Supplier s WHERE s.company.id = :companyId AND (" +
            "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(s.name), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(s.email) LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(s.phone) LIKE CONCAT('%', :q, '%'))")
    Page<Supplier> findByCompanyIdAndSearch(@Param("companyId") Long companyId, @Param("q") String q, Pageable pageable);
}
