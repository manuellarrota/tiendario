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
            @RequestParam(defaultValue = "10") int size) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return purchaseRepository.findByCompanyId(userDetails.getCompanyId(), pageable);
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

            // Update product stock and cost
            // Safely handle null stock (products created without initial stock)
            int currentStock = product.getStock() != null ? product.getStock() : 0;
            product.setStock(currentStock + itemRequest.getQuantity());
            product.setCostPrice(itemRequest.getUnitCost());
            productRepository.save(product);

            // Add item to purchase
            if (purchase.getItems() == null) {
                purchase.setItems(new java.util.ArrayList<>());
            }
            purchase.getItems().add(item);
        }

        purchaseRepository.save(purchase);
        
        org.slf4j.LoggerFactory.getLogger(PurchaseController.class).info("[COMPRA/STOCK] Usuario: {} | Empresa: {} | ID Compra: {} | Total: {}", 
            userDetails.getUsername(), purchase.getCompany().getName(), purchase.getId(), purchase.getTotal());

        return ResponseEntity.ok(new MessageResponse("Purchase recorded and stock updated!"));
    }
}
