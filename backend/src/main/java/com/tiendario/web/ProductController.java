package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.FileStorageService;
import com.tiendario.service.ProductIndexService;
import com.tiendario.repository.CatalogProductRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
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
    ProductIndexService productIndexService;

    @Autowired
    CatalogProductRepository catalogProductRepository;

    @Autowired
    FileStorageService fileStorageService;

    @Autowired
    com.tiendario.repository.CategoryRepository categoryRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String fileName = fileStorageService.storeFile(file);
            return ResponseEntity.ok(new MessageResponse("/api/products/images/" + fileName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Could not upload file: " + e.getMessage()));
        }
    }

    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<Resource> getImage(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(filename);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_JPEG)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/suggest-sku")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> suggestSku(@RequestParam String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String variant,
            @RequestParam(required = false) String brand) {
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

        // 3. Variant Prefix (Cleaned, 3 chars)
        if (variant != null && !variant.isEmpty()) {
            String cleanVar = variant.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            prefixBuilder.append(cleanVar.length() > 3 ? cleanVar.substring(0, 3) : cleanVar).append("-");
        }

        // 4. Brand Prefix (Cleaned, 3 chars)
        if (brand != null && !brand.isEmpty()) {
            String cleanBrand = brand.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            prefixBuilder.append(cleanBrand.length() > 3 ? cleanBrand.substring(0, 3) : cleanBrand).append("-");
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

        Map<String, String> response = new HashMap<>();
        response.put("suggestedSku", suggestedSku);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/catalog-search")
    @PreAuthorize("hasRole('MANAGER')")
    public List<com.tiendario.domain.CatalogProduct> searchCatalog(@RequestParam String q) {
        return catalogProductRepository.findByNameContainingIgnoreCase(q);
    }

    @GetMapping("/by-barcode/{barcode}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> findByBarcode(@PathVariable String barcode) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Try barcode first, then fall back to SKU (backwards compatibility)
        Product product = productRepository.findByBarcodeAndCompanyId(barcode, userDetails.getCompanyId())
                .orElseGet(() -> productRepository.findBySkuAndCompanyId(barcode, userDetails.getCompanyId()).orElse(null));

        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(product);
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> getCompanyProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean lowStock) {

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        try {
            List<org.springframework.data.domain.Sort.Order> orders = new java.util.ArrayList<>();

            if (sort[0].contains(",")) {
                for (String sortOrder : sort) {
                    String[] _sort = sortOrder.split(",");
                    orders.add(new org.springframework.data.domain.Sort.Order(
                            org.springframework.data.domain.Sort.Direction.fromString(_sort[1]), _sort[0]));
                }
            } else {
                orders.add(new org.springframework.data.domain.Sort.Order(
                        org.springframework.data.domain.Sort.Direction.fromString(sort[1]), sort[0]));
            }

            org.springframework.data.domain.Pageable paging = org.springframework.data.domain.PageRequest.of(page, size,
                    org.springframework.data.domain.Sort.by(orders));

            org.springframework.data.domain.Page<Product> pageProds = productRepository.findByCompanyIdAndSearch(
                    userDetails.getCompanyId(),
                    (q != null ? q.trim().toLowerCase() : ""),
                    lowStock,
                    paging);

            Map<String, Object> response = new HashMap<>();
            response.put("products", pageProds.getContent());
            response.put("currentPage", pageProds.getNumber());
            response.put("totalItems", pageProds.getTotalElements());
            response.put("totalPages", pageProds.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Ensure SKU uniqueness within the company
        if (productRepository.existsBySkuAndCompanyId(product.getSku(), userDetails.getCompanyId())) {
            log.warn("Attempt to create product with duplicate SKU: {} for company ID: {}", product.getSku(), userDetails.getCompanyId());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: SKU already exists in your inventory."));
        }

        product.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));

        // Block product creation for expired/suspended accounts
        if (product.getCompany() != null) {
            com.tiendario.domain.SubscriptionStatus status = product.getCompany().getSubscriptionStatus();

            if (com.tiendario.domain.SubscriptionStatus.PAST_DUE.equals(status)) {
                log.warn("Creation blocked: Company {} is PAST_DUE", product.getCompany().getName());
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu suscripción ha vencido. Renueva tu plan para poder agregar nuevos productos y seguir operando."));
            }
            if (com.tiendario.domain.SubscriptionStatus.SUSPENDED.equals(status)) {
                log.warn("Creation blocked: Company {} is SUSPENDED", product.getCompany().getName());
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu cuenta está suspendida. Contacta al administrador para reactivarla."));
            }

        }

        // --- CATALOG UNIFICATION LOGIC ---
        com.tiendario.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.tiendario.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(product.getName());
            catalog.setDescription(product.getDescription());
            catalog.setBrand(product.getBrand());
            catalog.setImageUrl(product.getImageUrl());
            
            // Map String category to Category entity
            if (product.getCategory() != null && !product.getCategory().isEmpty()) {
                com.tiendario.domain.Category cat = categoryRepository.findFirstByNameIgnoreCase(product.getCategory().trim())
                        .orElse(null);
                catalog.setCategory(cat);
            }
            
            catalog = catalogProductRepository.save(catalog);
        }
        product.setCatalogProduct(catalog);
        // Ensure local fields match catalog source of truth
        product.setName(catalog.getName());
        product.setDescription(catalog.getDescription());
        product.setImageUrl(catalog.getImageUrl());

        Product savedProduct = productRepository.save(product);
        log.info("🛒 [PRODUCTO] Usuario {} creó nuevo producto: '{}' (SKU: {})", 
                userDetails.getUsername(), savedProduct.getName(), savedProduct.getSku());

        // Index in search engine
        try {
            productIndexService.indexProduct(savedProduct);
        } catch (Exception e) {
            log.warn("Could not index product {}: {}", savedProduct.getId(), e.getMessage());
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
                        .body(new MessageResponse("Error: El SKU ya existe en tu inventario."));
            }
            product.setSku(newSku);
        }

        com.tiendario.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.tiendario.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(productDetails.getName());
            catalog.setDescription(productDetails.getDescription());
            catalog.setBrand(productDetails.getBrand());
            catalog.setImageUrl(productDetails.getImageUrl());
            
            // Map String category to Category entity
            if (productDetails.getCategory() != null && !productDetails.getCategory().isEmpty()) {
                com.tiendario.domain.Category cat = categoryRepository.findFirstByNameIgnoreCase(productDetails.getCategory().trim())
                        .orElse(null);
                catalog.setCategory(cat);
            }
            catalog = catalogProductRepository.save(catalog);
        } else {
            // If updating common info, we update the catalog (making it the source of truth for everyone)
            catalog.setName(productDetails.getName());
            catalog.setDescription(productDetails.getDescription());
            catalog.setImageUrl(productDetails.getImageUrl());
            
            // Map String category to Category entity
            if (productDetails.getCategory() != null && !productDetails.getCategory().isEmpty()) {
                com.tiendario.domain.Category cat = categoryRepository.findFirstByNameIgnoreCase(productDetails.getCategory().trim())
                        .orElse(null);
                catalog.setCategory(cat);
            }
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
        log.info("📝 [PRODUCTO] Usuario {} actualizó producto: '{}' (SKU: {})", 
                userDetails.getUsername(), updatedProduct.getName(), updatedProduct.getSku());

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
            log.error("Access denied or product not found: ID {} for company {}", id, userDetails.getCompanyId());
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Product not found or access denied."));
        }

        log.info("Deleting product ID: {} (SKU: {}) for Company ID: {}", id, product.getSku(), userDetails.getCompanyId());
        productRepository.delete(product);

        // Remove from search engine
        productIndexService.deleteProductIndex(id);

        return ResponseEntity.ok(new MessageResponse("Product deleted successfully!"));
    }
}
