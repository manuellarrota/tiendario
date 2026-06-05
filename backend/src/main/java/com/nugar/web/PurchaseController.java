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
}
