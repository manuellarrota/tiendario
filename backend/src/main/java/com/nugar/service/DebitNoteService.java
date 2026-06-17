package com.nugar.service;

import com.nugar.domain.*;
import com.nugar.repository.*;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DebitNoteService {

    @Autowired
    private DebitNoteRepository debitNoteRepository;

    @Autowired
    private PurchaseRepository purchaseRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Transactional
    public DebitNote createDebitNote(Long purchaseId, String reason,
                                        List<DebitNoteItemRequest> itemRequests, UserDetailsImpl userDetails) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new RuntimeException("Compra no encontrada"));

        if (!purchase.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Acceso denegado");
        }

        if (PurchaseStatus.FULL_REFUND.equals(purchase.getStatus())) {
            throw new RuntimeException("Error: Esta compra ya fue reembolsada completamente.");
        }
        if (PurchaseStatus.CANCELLED.equals(purchase.getStatus())) {
            throw new RuntimeException("Error: No se puede reembolsar una compra cancelada.");
        }

        BigDecimal totalRefund = BigDecimal.ZERO;

        DebitNote debitNote = new DebitNote();
        debitNote.setCompany(purchase.getCompany());
        debitNote.setPurchase(purchase);
        debitNote.setReason(reason);

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        debitNote.setCreatedBy(user);

        for (DebitNoteItemRequest req : itemRequests) {
            PurchaseItem purchaseItem = purchase.getItems().stream()
                    .filter(pi -> pi.getProduct().getId().equals(req.getProductId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Producto #" + req.getProductId() + " no pertenece a esta compra."));

            if (req.getQuantity() <= 0 || req.getQuantity() > purchaseItem.getQuantity()) {
                throw new RuntimeException("Error: Cantidad de devolución inválida para " + purchaseItem.getProduct().getName() +
                        ". Máximo: " + purchaseItem.getQuantity());
            }

            int alreadyRefunded = getAlreadyRefundedQuantity(purchaseId, req.getProductId());
            int maxReturnable = purchaseItem.getQuantity() - alreadyRefunded;
            if (req.getQuantity() > maxReturnable) {
                throw new RuntimeException("Error: Ya se devolvieron " + alreadyRefunded + " unidades de " +
                        purchaseItem.getProduct().getName() + ". Máximo devolvible: " + maxReturnable);
            }

            BigDecimal unitCost = purchaseItem.getUnitCostInBaseCurrency();
            BigDecimal itemRefund = unitCost.multiply(BigDecimal.valueOf(req.getQuantity()));

            DebitNoteItem dnItem = new DebitNoteItem();
            dnItem.setDebitNote(debitNote);
            dnItem.setProduct(purchaseItem.getProduct());
            dnItem.setQuantityReturned(req.getQuantity());
            dnItem.setUnitCost(unitCost);
            dnItem.setRefundAmount(itemRefund);
            debitNote.getItems().add(dnItem);

            // Reduce stock
            Product product = purchaseItem.getProduct();
            if (product.getStock() != null) {
                int newStock = product.getStock() - req.getQuantity();
                if (newStock < 0) {
                    throw new RuntimeException("Error: Stock insuficiente para devolver " + req.getQuantity() + " unidades de " + product.getName());
                }
                product.setStock(newStock);
                productRepository.save(product);
            }

            // Deduct from inventory batches (LIFO logic or specific batch if needed, here we'll deduct from newest)
            reduceInventoryBatches(product.getId(), req.getQuantity());

            totalRefund = totalRefund.add(itemRefund);
        }

        BigDecimal previouslyRefunded = getPreviouslyRefundedAmount(purchaseId);
        BigDecimal maxRefundable = purchase.getTotalInBaseCurrency().subtract(previouslyRefunded);

        if (totalRefund.compareTo(maxRefundable) > 0) {
            throw new RuntimeException("Error: El reembolso ($" + totalRefund + ") excede el máximo devolvible ($" + maxRefundable + ").");
        }

        debitNote.setAmount(totalRefund);

        // Record incoming cash to the shift
        Shift shift = shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                .orElseThrow(() -> new RuntimeException("No tienes un turno de caja abierto para registrar el ingreso del reembolso."));
        
        // Assuming cash refund for now, could add payment types to DebitNote later
        shift.setTotalCashInjections(shift.getTotalCashInjections().add(totalRefund));
        shiftRepository.save(shift);

        BigDecimal totalRefundedAfter = previouslyRefunded.add(totalRefund);
        if (totalRefundedAfter.compareTo(purchase.getTotalInBaseCurrency()) >= 0) {
            purchase.setStatus(PurchaseStatus.FULL_REFUND);
        } else {
            purchase.setStatus(PurchaseStatus.PARTIAL_REFUND);
        }
        purchaseRepository.save(purchase);

        return debitNoteRepository.save(debitNote);
    }

    public List<DebitNote> getCompanyDebitNotes(UserDetailsImpl userDetails) {
        return debitNoteRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    public List<DebitNote> getDebitNotesByPurchase(Long purchaseId, UserDetailsImpl userDetails) {
        return debitNoteRepository.findByPurchaseIdOrderByDateDesc(purchaseId);
    }

    private int getAlreadyRefundedQuantity(Long purchaseId, Long productId) {
        List<DebitNote> existingNotes = debitNoteRepository.findByPurchaseIdOrderByDateDesc(purchaseId);
        return existingNotes.stream()
                .flatMap(dn -> dn.getItems().stream())
                .filter(item -> item.getProduct().getId().equals(productId))
                .mapToInt(DebitNoteItem::getQuantityReturned)
                .sum();
    }

    private BigDecimal getPreviouslyRefundedAmount(Long purchaseId) {
        List<DebitNote> existingNotes = debitNoteRepository.findByPurchaseIdOrderByDateDesc(purchaseId);
        return existingNotes.stream()
                .map(DebitNote::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void reduceInventoryBatches(Long productId, int quantity) {
        List<InventoryBatch> batches = inventoryBatchRepository
                .findByProductIdOrderByCreatedAtDesc(productId);

        int remaining = quantity;
        for (InventoryBatch batch : batches) {
            if (remaining <= 0) break;

            int canDeduct = batch.getCurrentQuantity();
            if (canDeduct <= 0) continue;

            int toDeduct = Math.min(remaining, canDeduct);
            batch.setCurrentQuantity(batch.getCurrentQuantity() - toDeduct);
            inventoryBatchRepository.save(batch);
            remaining -= toDeduct;
        }
    }

    public static class DebitNoteItemRequest {
        private Long productId;
        private Integer quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
