package com.nugar.repository;

import com.nugar.domain.PurchaseAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PurchaseAdjustmentRepository extends JpaRepository<PurchaseAdjustment, Long> {
    List<PurchaseAdjustment> findByPurchaseIdOrderByDateAsc(Long purchaseId);
}
