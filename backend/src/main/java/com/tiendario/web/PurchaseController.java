package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.domain.Purchase;
import com.tiendario.domain.PurchaseItem;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.PurchaseRepository;
import com.tiendario.repository.SupplierRepository;
import com.tiendario.security.UserDetailsImpl;
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

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public Page<Purchase> getPurchases(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String supplier,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) com.tiendario.domain.PaymentMethod paymentMethod) {
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
            paymentMethod != null ? paymentMethod.name() : null,
            pageable
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> createPurchase(@RequestBody com.tiendario.payload.request.PurchaseRequest request) {
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

        // Set supplier if provided
        if (request.getSupplierId() != null) {
            purchase.setSupplier(supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found")));
        }

        // Process items
        for (com.tiendario.payload.request.PurchaseRequest.PurchaseItemRequest itemRequest : request.getItems()) {
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
            product.setStock(currentStock + itemRequest.getQuantity());
            product.setCostPrice(item.getUnitCostInBaseCurrency());
            productRepository.save(product);

            // Add item to purchase
            if (purchase.getItems() == null) {
                purchase.setItems(new java.util.ArrayList<>());
            }
            purchase.getItems().add(item);
        }

        purchaseRepository.save(purchase);
        
        String itemsDetail = purchase.getItems().stream()
                .map(i -> i.getQuantity() + "x " + i.getProduct().getName())
                .collect(java.util.stream.Collectors.joining(", "));

        org.slf4j.LoggerFactory.getLogger(PurchaseController.class).info("[NUEVA COMPRA] Gerente: {} | Proveedor: {} | Total Pagado: ${} | Detalle: [{}]", 
            userDetails.getUsername(), 
            purchase.getSupplier() != null ? purchase.getSupplier().getName() : "Sin Proveedor", 
            purchase.getTotal(),
            itemsDetail);

        return ResponseEntity.ok(new MessageResponse("Purchase recorded and stock updated!"));
    }
}
