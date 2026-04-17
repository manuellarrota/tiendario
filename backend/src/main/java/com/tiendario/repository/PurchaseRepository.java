package com.tiendario.repository;

import com.tiendario.domain.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByCompanyIdOrderByDateDesc(Long companyId);

    Page<Purchase> findByCompanyId(Long companyId, Pageable pageable);
}
