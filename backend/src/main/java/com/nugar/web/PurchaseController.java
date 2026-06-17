package com.nugar.web;

import com.nugar.domain.Product;
import com.nugar.domain.Purchase;
import com.nugar.domain.PurchaseItem;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.ProductRepository;
import com.nugar.repository.PurchaseRepository;
import com.nugar.repository.SupplierRepository;
import com.nugar.repository.InventoryBatchRepository;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.nugar.util.BusinessLogger;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    @Autowired
    PurchaseRepository purchaseRepository;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    SupplierRepository supplierRepository;

    @Autowired
    InventoryBatchRepository inventoryBatchRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Page<Purchase> getPurchases(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String supplier,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) com.nugar.domain.PaymentMethod paymentMethod) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());

        // Parse optional date params
        java.time.LocalDateTime from = null;
        java.time.LocalDateTime to = null;
        try {
            if (dateFrom != null && !dateFrom.isBlank())
                from = java.time.LocalDate.parse(dateFrom).atStartOfDay();
            if (dateTo != null && !dateTo.isBlank())
                to = java.time.LocalDate.parse(dateTo).atTime(23, 59, 59);
        } catch (Exception ignored) {}

        return purchaseRepository.findByFilters(
            userDetails.getCompanyId(),
            (supplier != null && !supplier.isBlank()) ? supplier : null,
            from,
            to,
            paymentMethod,
            pageable
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> createPurchase(@RequestBody com.nugar.payload.request.PurchaseRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Create Purchase entity
        Purchase purchase = new Purchase();
        purchase.setCompany(companyRepository.findById(userDetails.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Company not found")));
        purchase.setDate(LocalDateTime.now());
        purchase.setTotal(request.getTotal());
        purchase.setCurrencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : "USD");
        purchase.setExchangeRate(request.getExchangeRate() != null ? request.getExchangeRate() : java.math.BigDecimal.ONE);
        purchase.setTotalInBaseCurrency(request.getTotalInBaseCurrency() != null ? request.getTotalInBaseCurrency() : request.getTotal());
        if (request.getPaymentMethod() != null) {
            purchase.setPaymentMethod(request.getPaymentMethod());
        }
        if (request.getInvoiceNumber() != null && !request.getInvoiceNumber().isBlank()) {
            purchase.setInvoiceNumber(request.getInvoiceNumber());
        }
        
        purchase.setGlobalDiscountAmount(request.getGlobalDiscountAmount());
        purchase.setGlobalDiscountType(request.getGlobalDiscountType());

        // Zero-Trust: Validate global discount does not exceed purchase total
        if (request.getGlobalDiscountAmount() != null && request.getGlobalDiscountAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            java.math.BigDecimal effectiveGlobalDiscount = request.getGlobalDiscountAmount();
            java.math.BigDecimal referenceTotal = request.getTotalInBaseCurrency() != null ? request.getTotalInBaseCurrency() : request.getTotal();
            if (request.getGlobalDiscountType() != null && com.nugar.domain.DiscountType.PERCENTAGE.equals(request.getGlobalDiscountType())) {
                if (effectiveGlobalDiscount.compareTo(new java.math.BigDecimal("100")) > 0) {
                    throw new RuntimeException("Error: El descuento global porcentual (" + effectiveGlobalDiscount + "%) no puede exceder el 100%.");
                }
            } else {
                if (effectiveGlobalDiscount.compareTo(referenceTotal) > 0) {
                    throw new RuntimeException("Error: El descuento global ($" + effectiveGlobalDiscount + ") excede el total de la compra ($" + referenceTotal + ").");
                }
            }
        }

        // Set supplier if provided
        if (request.getSupplierId() != null) {
            purchase.setSupplier(supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found")));
        }

        // Save purchase first to have an ID for InventoryBatches
        purchase = purchaseRepository.save(purchase);

        // Process items
        for (com.nugar.payload.request.PurchaseRequest.PurchaseItemRequest itemRequest : request.getItems()) {
            // Fetch product
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Security check: ensure product belongs to company
            if (!product.getCompany().getId().equals(userDetails.getCompanyId())) {
                throw new RuntimeException("Unauthorized access to product");
            }

            // Create purchase item
            PurchaseItem item = new PurchaseItem();
            item.setPurchase(purchase);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());
            item.setUnitCost(itemRequest.getUnitCost());
            
            item.setDiscountAmount(itemRequest.getDiscountAmount());
            item.setDiscountType(itemRequest.getDiscountType());
            
            item.setUnitCostInBaseCurrency(itemRequest.getUnitCostInBaseCurrency() != null ? itemRequest.getUnitCostInBaseCurrency() : itemRequest.getUnitCost().divide(purchase.getExchangeRate(), 4, java.math.RoundingMode.HALF_UP));
            item.setSubtotalInBaseCurrency(itemRequest.getSubtotalInBaseCurrency() != null ? itemRequest.getSubtotalInBaseCurrency() : item.getUnitCostInBaseCurrency().multiply(java.math.BigDecimal.valueOf(itemRequest.getQuantity())));

            // Update product stock and cost
            // Safely handle null stock (products created without initial stock)
            int currentStock = product.getStock() != null ? product.getStock() : 0;
            
            // Calculate Weighted Average Cost
            java.math.BigDecimal currentTotalValue = (product.getCostPrice() != null ? product.getCostPrice() : java.math.BigDecimal.ZERO)
                    .multiply(java.math.BigDecimal.valueOf(currentStock));
            java.math.BigDecimal newPurchaseValue = item.getUnitCostInBaseCurrency()
                    .multiply(java.math.BigDecimal.valueOf(itemRequest.getQuantity()));
            java.math.BigDecimal totalStock = java.math.BigDecimal.valueOf(currentStock + itemRequest.getQuantity());

            java.math.BigDecimal newAverageCost = currentTotalValue.add(newPurchaseValue)
                    .divide(totalStock, 4, java.math.RoundingMode.HALF_UP);

            product.setStock(currentStock + itemRequest.getQuantity());
            product.setCostPrice(newAverageCost);
            productRepository.save(product);

            // Add item to purchase
            if (purchase.getItems() == null) {
                purchase.setItems(new java.util.ArrayList<>());
            }
            purchase.getItems().add(item);
            
            // Create Inventory Batch
            com.nugar.domain.InventoryBatch batch = new com.nugar.domain.InventoryBatch();
            batch.setProduct(product);
            batch.setPurchase(purchase);
            batch.setInitialQuantity(itemRequest.getQuantity());
            batch.setCurrentQuantity(itemRequest.getQuantity());
            batch.setUnitCost(item.getUnitCostInBaseCurrency());
            batch.setCreatedAt(LocalDateTime.now());
            inventoryBatchRepository.save(batch);
        }

        purchaseRepository.save(purchase);
        
        String itemsDetail = purchase.getItems().stream()
                .map(i -> i.getQuantity() + "x " + i.getProduct().getName())
                .collect(java.util.stream.Collectors.joining(", "));

        final Purchase finalPurchase = purchase;
        BusinessLogger.log(org.slf4j.LoggerFactory.getLogger(PurchaseController.class), "NUEVA_COMPRA", data -> {
            data.put("gerente", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("compraId", finalPurchase.getId());
            data.put("proveedor", finalPurchase.getSupplier() != null ? finalPurchase.getSupplier().getName() : "Sin Proveedor");
            data.put("moneda", finalPurchase.getCurrencyCode());
            data.put("total", finalPurchase.getTotal());
            data.put("totalUSD", finalPurchase.getTotalInBaseCurrency());
            if (finalPurchase.getExchangeRate() != null && finalPurchase.getExchangeRate().compareTo(java.math.BigDecimal.ONE) != 0)
                data.put("tasa", finalPurchase.getExchangeRate());
            if (finalPurchase.getPaymentMethod() != null) data.put("metodoPago", finalPurchase.getPaymentMethod());
            if (finalPurchase.getInvoiceNumber() != null) data.put("numeroFactura", finalPurchase.getInvoiceNumber());
            java.util.List<java.util.Map<String, Object>> items = new java.util.ArrayList<>();
            for (PurchaseItem i : finalPurchase.getItems()) {
                java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("producto", i.getProduct().getName());
                item.put("cantidad", i.getQuantity());
                item.put("costoUnit", i.getUnitCostInBaseCurrency());
                item.put("subtotalUSD", i.getSubtotalInBaseCurrency());
                items.add(item);
            }
            data.put("detalle", items);
        });

        return ResponseEntity.ok(new MessageResponse("Purchase recorded and stock updated!"));
    }

    @Autowired
    com.nugar.repository.PurchaseAdjustmentRepository purchaseAdjustmentRepository;

    @Autowired
    com.nugar.repository.UserRepository userRepository;

    @GetMapping("/{id}/adjustments")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> getPurchaseAdjustments(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase not found"));

        if (!purchase.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Unauthorized"));
        }

        List<com.nugar.domain.PurchaseAdjustment> adjustments = purchaseAdjustmentRepository.findByPurchaseIdOrderByDateAsc(id);
        return ResponseEntity.ok(adjustments);
    }

    @PostMapping("/{id}/adjustments")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> addPurchaseAdjustment(@PathVariable Long id, @RequestBody AdjustmentRequest req) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase not found"));

        if (!purchase.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Unauthorized"));
        }

        com.nugar.domain.User currentUser = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        com.nugar.domain.PurchaseAdjustment adj = new com.nugar.domain.PurchaseAdjustment();
        adj.setPurchase(purchase);
        adj.setType(com.nugar.domain.AdjustmentType.valueOf(req.getType()));
        adj.setAmount(req.getAmount());
        adj.setDocumentNumber(req.getDocumentNumber());
        adj.setReason(req.getReason());
        adj.setDate(LocalDateTime.now());
        adj.setCreatedBy(currentUser);

        purchaseAdjustmentRepository.save(adj);

        return ResponseEntity.ok(new MessageResponse("Adjustment added successfully"));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> voidPurchase(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String reason = body.get("reason");
        
        if (reason == null || reason.trim().length() < 10) {
            return ResponseEntity.badRequest().body(new MessageResponse("El motivo de anulación debe tener al menos 10 caracteres."));
        }

        Purchase purchase = purchaseRepository.findById(id).orElse(null);
        if (purchase == null || !purchase.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.notFound().build();
        }

        if (purchase.getStatus() == com.nugar.domain.PurchaseStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(new MessageResponse("Esta compra ya se encuentra anulada."));
        }

        // Validate stock
        if (purchase.getItems() != null) {
            for (PurchaseItem item : purchase.getItems()) {
                if (item.getProduct() != null && item.getQuantity() != null) {
                    int currentStock = item.getProduct().getStock();
                    if (currentStock < item.getQuantity()) {
                        return ResponseEntity.badRequest().body(new MessageResponse(
                                "No se puede anular: el producto '" + item.getProduct().getName() +
                                "' tiene solo " + currentStock + " unidades en stock, pero la compra añadió " +
                                item.getQuantity() + ". Parte de ese stock ya fue vendido."));
                    }
                }
            }
        }

        // Discount stock and invalidate batches
        if (purchase.getItems() != null) {
            for (PurchaseItem item : purchase.getItems()) {
                if (item.getProduct() != null && item.getQuantity() != null) {
                    Product product = item.getProduct();
                    product.setStock(product.getStock() - item.getQuantity());
                    productRepository.save(product);
                }
            }
        }

        java.util.List<com.nugar.domain.InventoryBatch> batches = inventoryBatchRepository.findAll().stream()
                .filter(b -> b.getPurchase() != null && b.getPurchase().getId().equals(id))
                .collect(java.util.stream.Collectors.toList());
        for (com.nugar.domain.InventoryBatch batch : batches) {
            batch.setCurrentQuantity(0);
            inventoryBatchRepository.save(batch);
        }

        purchase.setStatus(com.nugar.domain.PurchaseStatus.CANCELLED);
        purchaseRepository.save(purchase);

        BusinessLogger.log(org.slf4j.LoggerFactory.getLogger(PurchaseController.class), "ANULAR_COMPRA", data -> {
            data.put("gerente", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("compraId", purchase.getId());
            data.put("motivo", reason);
        });

        return ResponseEntity.ok(new MessageResponse("Compra anulada. Stock descontado correctamente."));
    }

    @PatchMapping("/{id}/costs")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> updatePurchaseCosts(@PathVariable Long id, @RequestBody com.nugar.payload.request.PurchaseCostUpdateRequest req) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Purchase purchase = purchaseRepository.findById(id).orElse(null);

        if (purchase == null || !purchase.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.notFound().build();
        }

        if (purchase.getStatus() == com.nugar.domain.PurchaseStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(new MessageResponse("No se puede editar el costo de una compra anulada."));
        }

        java.math.BigDecimal newTotal = java.math.BigDecimal.ZERO;
        java.math.BigDecimal newTotalBase = java.math.BigDecimal.ZERO;

        if (purchase.getItems() != null && req.getItems() != null) {
            for (PurchaseItem item : purchase.getItems()) {
                com.nugar.payload.request.PurchaseCostUpdateRequest.ItemCostUpdate update = req.getItems().stream()
                        .filter(i -> i.getPurchaseItemId().equals(item.getId()))
                        .findFirst()
                        .orElse(null);

                if (update != null && update.getNewUnitCost() != null) {
                    item.setUnitCost(update.getNewUnitCost());
                    java.math.BigDecimal unitCostBase = update.getNewUnitCost();
                    if (purchase.getExchangeRate() != null && purchase.getExchangeRate().compareTo(java.math.BigDecimal.ZERO) > 0) {
                        unitCostBase = update.getNewUnitCost().divide(purchase.getExchangeRate(), 4, java.math.RoundingMode.HALF_UP);
                    }
                    item.setUnitCostInBaseCurrency(unitCostBase);
                    item.setSubtotalInBaseCurrency(unitCostBase.multiply(java.math.BigDecimal.valueOf(item.getQuantity())));

                    // Find and update InventoryBatch
                    java.util.List<com.nugar.domain.InventoryBatch> batches = inventoryBatchRepository.findAll().stream()
                            .filter(b -> b.getPurchase() != null && b.getPurchase().getId().equals(id) && b.getProduct().getId().equals(item.getProduct().getId()))
                            .collect(java.util.stream.Collectors.toList());
                    for (com.nugar.domain.InventoryBatch batch : batches) {
                        batch.setUnitCost(unitCostBase);
                        inventoryBatchRepository.save(batch);
                    }
                }
                
                // Keep summing up to recalculate total
                newTotal = newTotal.add(item.getUnitCost().multiply(java.math.BigDecimal.valueOf(item.getQuantity())));
                newTotalBase = newTotalBase.add(item.getSubtotalInBaseCurrency());
            }
        }

        purchase.setTotal(newTotal);
        purchase.setTotalInBaseCurrency(newTotalBase);
        purchaseRepository.save(purchase);

        final java.math.BigDecimal finalTotal = newTotal;
        BusinessLogger.log(org.slf4j.LoggerFactory.getLogger(PurchaseController.class), "COMPRA_COSTO_CORREGIDO", data -> {
            data.put("gerente", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("compraId", purchase.getId());
            data.put("nuevoTotal", finalTotal);
        });

        return ResponseEntity.ok(new MessageResponse("Costos actualizados correctamente."));
    }

    public static class AdjustmentRequest {
        private String type;
        private java.math.BigDecimal amount;
        private String documentNumber;
        private String reason;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public java.math.BigDecimal getAmount() { return amount; }
        public void setAmount(java.math.BigDecimal amount) { this.amount = amount; }
        public String getDocumentNumber() { return documentNumber; }
        public void setDocumentNumber(String documentNumber) { this.documentNumber = documentNumber; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
