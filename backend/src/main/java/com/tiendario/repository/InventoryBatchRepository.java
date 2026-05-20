package com.tiendario.repository;

import com.tiendario.domain.InventoryBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, Long> {
    List<InventoryBatch> findByProductIdAndCurrentQuantityGreaterThanOrderByCreatedAtAsc(Long productId, Integer quantity);
}
