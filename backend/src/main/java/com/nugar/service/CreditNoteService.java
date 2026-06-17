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
public class CreditNoteService {

    @Autowired
    private CreditNoteRepository creditNoteRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Transactional
    public CreditNote createCreditNote(Long saleId, String reason, CreditNote.CreditNoteType type,
                                        List<CreditNoteItemRequest> itemRequests, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (!sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Acceso denegado");
        }

        // Validate sale is eligible for refund
        if (SaleStatus.FULL_REFUND.equals(sale.getStatus())) {
            throw new RuntimeException("Error: Esta venta ya fue reembolsada completamente.");
        }
        if (SaleStatus.CANCELLED.equals(sale.getStatus())) {
            throw new RuntimeException("Error: No se puede reembolsar una venta cancelada.");
        }

        // Validate items and calculate total refund amount
        BigDecimal totalRefund = BigDecimal.ZERO;

        CreditNote creditNote = new CreditNote();
        creditNote.setCompany(sale.getCompany());
        creditNote.setSale(sale);
        creditNote.setReason(reason);
        creditNote.setType(type);

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        creditNote.setCreatedBy(user);

        if (sale.getCustomer() != null) {
            creditNote.setCustomer(sale.getCustomer());
        }

        // Process each returned item
        for (CreditNoteItemRequest req : itemRequests) {
            SaleItem saleItem = sale.getItems().stream()
                    .filter(si -> si.getProduct().getId().equals(req.getProductId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Producto #" + req.getProductId() + " no pertenece a esta venta."));

            if (req.getQuantity() <= 0 || req.getQuantity() > saleItem.getQuantity()) {
                throw new RuntimeException("Error: Cantidad de devolución inválida para " + saleItem.getProduct().getName() +
                        ". Máximo: " + saleItem.getQuantity());
            }

            // Check previous refunds for this product in this sale
            int alreadyRefunded = getAlreadyRefundedQuantity(saleId, req.getProductId());
            int maxReturnable = saleItem.getQuantity() - alreadyRefunded;
            if (req.getQuantity() > maxReturnable) {
                throw new RuntimeException("Error: Ya se devolvieron " + alreadyRefunded + " unidades de " +
                        saleItem.getProduct().getName() + ". Máximo devolvible: " + maxReturnable);
            }

            BigDecimal unitPrice = saleItem.getUnitPrice();
            BigDecimal itemRefund = unitPrice.multiply(BigDecimal.valueOf(req.getQuantity()));

            CreditNoteItem cnItem = new CreditNoteItem();
            cnItem.setCreditNote(creditNote);
            cnItem.setProduct(saleItem.getProduct());
            cnItem.setQuantityReturned(req.getQuantity());
            cnItem.setUnitPrice(unitPrice);
            cnItem.setRefundAmount(itemRefund);
            creditNote.getItems().add(cnItem);

            // Return stock
            Product product = saleItem.getProduct();
            product.setStock(product.getStock() + req.getQuantity());
            productRepository.save(product);

            // Restore inventory batches (LIFO — reverse of FIFO sale deduction)
            restoreInventoryBatches(product.getId(), req.getQuantity());

            totalRefund = totalRefund.add(itemRefund);
        }

        // Validate refund amount doesn't exceed sale total
        BigDecimal previouslyRefunded = getPreviouslyRefundedAmount(saleId);
        BigDecimal maxRefundable = sale.getTotalAmount().subtract(previouslyRefunded);

        if (totalRefund.compareTo(maxRefundable) > 0) {
            throw new RuntimeException("Error: El reembolso ($" + totalRefund + ") excede el máximo devolvible ($" + maxRefundable + ").");
        }

        creditNote.setAmount(totalRefund);

        // Apply refund logic based on type
        if (type == CreditNote.CreditNoteType.STORE_CREDIT) {
            if (sale.getCustomer() == null) {
                throw new RuntimeException("No se puede emitir saldo a favor si la venta no tiene un cliente asociado.");
            }
            Customer customer = sale.getCustomer();
            if (customer.getStoreCredit() == null) {
                customer.setStoreCredit(BigDecimal.ZERO);
            }
            customer.setStoreCredit(customer.getStoreCredit().add(totalRefund));
            customerRepository.save(customer);
        } else {
            // Register outgoing cash in the active shift
            Shift shift = shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                    .orElseThrow(() -> new RuntimeException("No tienes un turno de caja abierto para registrar el reembolso."));

            switch (type) {
                case REFUND_TO_CASH:
                    shift.setRefundedCash(shift.getRefundedCash().add(totalRefund));
                    break;
                case REFUND_TO_CARD:
                    shift.setRefundedCard(shift.getRefundedCard().add(totalRefund));
                    break;
                case REFUND_TO_TRANSFER:
                    shift.setRefundedTransfer(shift.getRefundedTransfer().add(totalRefund));
                    break;
                case REFUND_TO_MOBILE:
                    shift.setRefundedMobile(shift.getRefundedMobile().add(totalRefund));
                    break;
            }
            shiftRepository.save(shift);
        }

        // Determine if the sale is fully or partially refunded
        BigDecimal totalRefundedAfter = previouslyRefunded.add(totalRefund);
        if (totalRefundedAfter.compareTo(sale.getTotalAmount()) >= 0) {
            sale.setStatus(SaleStatus.FULL_REFUND);
        } else {
            sale.setStatus(SaleStatus.PARTIAL_REFUND);
        }
        saleRepository.save(sale);

        return creditNoteRepository.save(creditNote);
    }

    public List<CreditNote> getCompanyCreditNotes(UserDetailsImpl userDetails) {
        return creditNoteRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    public List<CreditNote> getCreditNotesBySale(Long saleId, UserDetailsImpl userDetails) {
        return creditNoteRepository.findBySaleIdOrderByDateDesc(saleId);
    }

    private int getAlreadyRefundedQuantity(Long saleId, Long productId) {
        List<CreditNote> existingNotes = creditNoteRepository.findBySaleIdOrderByDateDesc(saleId);
        return existingNotes.stream()
                .flatMap(cn -> cn.getItems().stream())
                .filter(item -> item.getProduct().getId().equals(productId))
                .mapToInt(CreditNoteItem::getQuantityReturned)
                .sum();
    }

    private BigDecimal getPreviouslyRefundedAmount(Long saleId) {
        List<CreditNote> existingNotes = creditNoteRepository.findBySaleIdOrderByDateDesc(saleId);
        return existingNotes.stream()
                .map(CreditNote::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void restoreInventoryBatches(Long productId, int quantity) {
        // Restore to the most recent batches first (LIFO restore)
        List<InventoryBatch> batches = inventoryBatchRepository
                .findByProductIdOrderByCreatedAtDesc(productId);

        int remaining = quantity;
        for (InventoryBatch batch : batches) {
            if (remaining <= 0) break;

            int canRestore = batch.getInitialQuantity() - batch.getCurrentQuantity();
            if (canRestore <= 0) continue;

            int toRestore = Math.min(remaining, canRestore);
            batch.setCurrentQuantity(batch.getCurrentQuantity() + toRestore);
            inventoryBatchRepository.save(batch);
            remaining -= toRestore;
        }
    }

    // DTO for item-level return requests
    public static class CreditNoteItemRequest {
        private Long productId;
        private Integer quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
