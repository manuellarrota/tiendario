package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    ProductRepository productRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    com.tiendario.service.ProductIndexService productIndexService;

    @Autowired
    com.tiendario.repository.CatalogProductRepository catalogProductRepository;

    @GetMapping("/suggest-sku")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> suggestSku(@RequestParam String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String variant) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        StringBuilder prefixBuilder = new StringBuilder();

        // 1. Category Prefix (3 chars)
        if (category != null && !category.isEmpty()) {
            String cleanCat = category.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            prefixBuilder.append(cleanCat.length() > 3 ? cleanCat.substring(0, 3) : cleanCat).append("-");
        }

        // 2. Name Prefix (First word, 4 chars)
        if (name != null && !name.isEmpty()) {
            String firstWord = name.trim().split("\\s+")[0].replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            prefixBuilder.append(firstWord.length() > 4 ? firstWord.substring(0, 4) : firstWord).append("-");
        }

        // 3. Variant Prefix (Cleaned, 4 chars)
        if (variant != null && !variant.isEmpty()) {
            String cleanVar = variant.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            prefixBuilder.append(cleanVar.length() > 4 ? cleanVar.substring(0, 4) : cleanVar).append("-");
        }

        String finalPrefix = prefixBuilder.toString();
        if (finalPrefix.endsWith("-")) {
            finalPrefix = finalPrefix.substring(0, finalPrefix.length() - 1);
        }

        long count = productRepository.countByCompanyId(userDetails.getCompanyId()) + 1;
        String suggestedSku = String.format("%s-%04d", finalPrefix, count);

        // Ensure uniqueness
        int attempt = 0;
        while (productRepository.existsBySkuAndCompanyId(suggestedSku, userDetails.getCompanyId()) && attempt < 50) {
            attempt++;
            suggestedSku = String.format("%s-%04d", finalPrefix, count + attempt);
        }

        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("suggestedSku", suggestedSku);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/catalog-search")
    @PreAuthorize("hasRole('MANAGER')")
    public List<com.tiendario.domain.CatalogProduct> searchCatalog(@RequestParam String q) {
        return catalogProductRepository.findByNameContainingIgnoreCase(q);
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Product> getCompanyProducts() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return productRepository.findByCompanyId(userDetails.getCompanyId());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Ensure SKU uniqueness within the company
        if (productRepository.existsBySkuAndCompanyId(product.getSku(), userDetails.getCompanyId())) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: SKU already exists in your inventory."));
        }

        product.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));

        // Block product creation for expired/suspended accounts
        if (product.getCompany() != null) {
            com.tiendario.domain.SubscriptionStatus status = product.getCompany().getSubscriptionStatus();

            if (com.tiendario.domain.SubscriptionStatus.PAST_DUE.equals(status)) {
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu suscripción ha vencido. Renueva tu plan para poder agregar nuevos productos y seguir operando."));
            }
            if (com.tiendario.domain.SubscriptionStatus.SUSPENDED.equals(status)) {
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu cuenta está suspendida. Contacta al administrador para reactivarla."));
            }

            if (com.tiendario.domain.SubscriptionStatus.FREE.equals(status)) {
                long currentCount = productRepository.countByCompanyId(userDetails.getCompanyId());
                if (currentCount >= 10) {
                    return ResponseEntity.badRequest()
                            .body(new MessageResponse(
                                    "Límite alcanzado: El plan GRATUITO solo permite hasta 10 productos. ¡Mejora a PREMIUM para productos ilimitados!"));
                }
            }
        }

        // --- CATALOG UNIFICATION LOGIC ---
        com.tiendario.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.tiendario.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(product.getName());
            catalog.setDescription(product.getDescription());
            catalog.setImageUrl(product.getImageUrl());
            // Optional: catalog.setCategory(product.getCategory());
            catalog = catalogProductRepository.save(catalog);
        }
        product.setCatalogProduct(catalog);
        // Ensure local fields match catalog source of truth
        product.setName(catalog.getName());
        product.setDescription(catalog.getDescription());
        product.setImageUrl(catalog.getImageUrl());

        Product savedProduct = productRepository.save(product);

        // Index in search engine
        try {
            productIndexService.indexProduct(savedProduct);
        } catch (Exception e) {
            System.err.println("Warning: Could not index product: " + e.getMessage());
        }

        return ResponseEntity.ok(savedProduct);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Product productDetails) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Product not found or access denied."));
        }

        // Centralized Catalog Sync during update
        String currentSku = product.getSku();
        String newSku = productDetails.getSku();

        if (newSku != null && !newSku.equals(currentSku)) {
            if (productRepository.existsBySkuAndCompanyId(newSku, userDetails.getCompanyId())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: SKU already exists in your inventory."));
            }
            product.setSku(newSku);
        }

        com.tiendario.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.tiendario.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(productDetails.getName());
            catalog.setDescription(productDetails.getDescription());
            catalog.setImageUrl(productDetails.getImageUrl());
            // Note: catalog.category is a @ManyToOne entity, product.category is a String.
            // Category sync between catalog and product is handled at the Product level,
            // not here.
            catalog = catalogProductRepository.save(catalog);
        } else {
            // If updating common info, we update the catalog (making it the source of truth
            // for everyone)
            catalog.setName(productDetails.getName());
            catalog.setDescription(productDetails.getDescription());
            catalog.setImageUrl(productDetails.getImageUrl());
            // Note: catalog.category is a @ManyToOne entity, product.category is a String.
            // Category sync between catalog and product is handled at the Product level,
            // not here.
            catalog = catalogProductRepository.save(catalog);

            // Sync local fields too for compatibility
            product.setName(catalog.getName());
            product.setDescription(catalog.getDescription());
            product.setImageUrl(catalog.getImageUrl());
        }
        product.setCatalogProduct(catalog);

        product.setPrice(productDetails.getPrice());
        product.setCostPrice(productDetails.getCostPrice());
        product.setStock(productDetails.getStock());
        product.setMinStock(productDetails.getMinStock());

        Product updatedProduct = productRepository.save(product);

        // Update index
        productIndexService.indexProduct(updatedProduct);

        return ResponseEntity.ok(new MessageResponse("Product updated successfully!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Product not found or access denied."));
        }

        productRepository.delete(product);

        // Remove from search engine
        productIndexService.deleteProductIndex(id);

        return ResponseEntity.ok(new MessageResponse("Product deleted successfully!"));
    }
}
