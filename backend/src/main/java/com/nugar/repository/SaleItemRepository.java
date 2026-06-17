package com.nugar.repository;

import com.nugar.domain.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    @Query("SELECT si FROM SaleItem si JOIN si.sale s WHERE si.product.id = :productId AND s.status != 'CANCELLED' AND s.date >= :startDate ORDER BY s.date ASC")
    List<SaleItem> findValidSalesByProductIdSince(@Param("productId") Long productId, @Param("startDate") LocalDateTime startDate);
}
