package com.nugar.repository;

import com.nugar.domain.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {
    @Query("SELECT pi FROM PurchaseItem pi JOIN pi.purchase p WHERE pi.product.id = :productId AND p.status != 'CANCELLED' AND p.date >= :startDate ORDER BY p.date ASC")
    List<PurchaseItem> findValidPurchasesByProductIdSince(@Param("productId") Long productId, @Param("startDate") LocalDateTime startDate);
}
