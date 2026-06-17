package com.nugar.web;

import com.nugar.domain.Product;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.ProductRepository;
import com.nugar.repository.UserRepository;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.S3StorageService;
import com.nugar.service.ProductIndexService;
import com.nugar.repository.CatalogProductRepository;
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

import com.nugar.util.BusinessLogger;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
    com.nugar.repository.CatalogSuggestionRepository catalogSuggestionRepository;

    @Autowired
    S3StorageService s3StorageService;

    @Autowired
    com.nugar.repository.CategoryRepository categoryRepository;

    @Autowired
    com.nugar.repository.PurchaseItemRepository purchaseItemRepository;

    @Autowired
    com.nugar.repository.SaleItemRepository saleItemRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String fileUrl = s3StorageService.storeFile(file);
            return ResponseEntity.ok(new MessageResponse(fileUrl));
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
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
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
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public List<com.nugar.domain.CatalogProduct> searchCatalog(@RequestParam String q) {
        return catalogProductRepository.searchCatalog(com.nugar.util.SearchUtils.normalize(q));
    }

    @GetMapping("/by-barcode/{barcode}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
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
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public ResponseEntity<?> getCompanyProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean lowStock,
            @RequestParam(defaultValue = "false") boolean lowMargin) {

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
                    (q != null ? com.nugar.util.SearchUtils.normalize(q) : ""),
                    lowStock,
                    lowMargin,
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
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Ensure SKU uniqueness within the company
        if (productRepository.existsBySkuAndCompanyId(product.getSku(), userDetails.getCompanyId())) {
            BusinessLogger.warn(log, "PRODUCTO_SKU_DUPLICADO", data -> {
                data.put("usuario", userDetails.getUsername());
                data.put("empresaId", userDetails.getCompanyId());
                data.put("sku", product.getSku());
            });
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: SKU already exists in your inventory."));
        }

        product.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));

        // Block product creation for expired/suspended accounts
        if (product.getCompany() != null) {
            com.nugar.domain.SubscriptionStatus status = product.getCompany().getSubscriptionStatus();

            if (com.nugar.domain.SubscriptionStatus.PAST_DUE.equals(status)) {
                BusinessLogger.warn(log, "PRODUCTO_BLOQUEADO_SUSCRIPCION", data -> {
                    data.put("empresa", product.getCompany().getName());
                    data.put("motivo", "PAST_DUE");
                });
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu suscripción ha vencido. Renueva tu plan para poder agregar nuevos productos y seguir operando."));
            }
            if (com.nugar.domain.SubscriptionStatus.SUSPENDED.equals(status)) {
                BusinessLogger.warn(log, "PRODUCTO_BLOQUEADO_SUSCRIPCION", data -> {
                    data.put("empresa", product.getCompany().getName());
                    data.put("motivo", "SUSPENDED");
                });
                return ResponseEntity.status(403)
                        .body(new MessageResponse(
                                "Tu cuenta está suspendida. Contacta al administrador para reactivarla."));
            }

        }

        com.nugar.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.nugar.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(product.getName());
            catalog.setDescription(product.getDescription());
            catalog.setBrand(product.getBrand());
            catalog.setImageUrl(product.getImageUrl());
            
            // Map String category to Category entity
            if (product.getCategory() != null && !product.getCategory().isEmpty()) {
                com.nugar.domain.Category cat = categoryRepository.findFirstByNameIgnoreCase(product.getCategory().trim())
                        .orElse(null);
                catalog.setCategory(cat);
            }
            
            catalog = catalogProductRepository.save(catalog);
        } else {
            // Check if local differs from global catalog, if so suggest
            boolean suggestsChange = false;
            if (product.getName() != null && !product.getName().equals(catalog.getName())) suggestsChange = true;
            if (product.getDescription() != null && !product.getDescription().equals(catalog.getDescription())) suggestsChange = true;
            if (product.getImageUrl() != null && !product.getImageUrl().equals(catalog.getImageUrl())) suggestsChange = true;
            
            if (suggestsChange && product.getCompany() != null) {
                com.nugar.domain.CatalogSuggestion suggestion = new com.nugar.domain.CatalogSuggestion();
                suggestion.setCompanyId(product.getCompany().getId());
                suggestion.setCompanyName(product.getCompany().getName());
                suggestion.setCatalogProduct(catalog);
                suggestion.setSuggestedName(product.getName());
                suggestion.setSuggestedDescription(product.getDescription());
                suggestion.setSuggestedImageUrl(product.getImageUrl());
                suggestion.setStatus(com.nugar.domain.SuggestionStatus.PENDING);
                catalogSuggestionRepository.save(suggestion);
                final String catalogSku = catalog.getSku();
                BusinessLogger.log(log, "SUGERENCIA_CATALOGO", data -> {
                    data.put("usuario", userDetails.getUsername());
                    data.put("empresa", product.getCompany().getName());
                    data.put("sku", catalogSku);
                    data.put("nombreSugerido", suggestion.getSuggestedName());
                    data.put("accion", "CREACION");
                });
            }
        }
        product.setCatalogProduct(catalog);
        // Do NOT overwrite local fields with catalog anymore
        // product.setName(catalog.getName());
        // product.setDescription(catalog.getDescription());
        // product.setImageUrl(catalog.getImageUrl());

        Product savedProduct = productRepository.save(product);
        BusinessLogger.log(log, "PRODUCTO_CREADO", data -> {
            data.put("usuario", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("productoId", savedProduct.getId());
            data.put("nombre", savedProduct.getName());
            data.put("sku", savedProduct.getSku());
            if (savedProduct.getPrice() != null) data.put("precio", savedProduct.getPrice());
            if (savedProduct.getStock() != null) data.put("stockInicial", savedProduct.getStock());
            if (savedProduct.getCategory() != null) data.put("categoria", savedProduct.getCategory());
        });

        // Index in search engine
        try {
            productIndexService.indexProduct(savedProduct);
        } catch (Exception e) {
            log.warn("[PRODUCTO_INDEX] Could not index product {}: {}", savedProduct.getId(), e.getMessage());
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

        com.nugar.domain.CatalogProduct catalog = catalogProductRepository.findBySku(product.getSku()).orElse(null);
        if (catalog == null) {
            catalog = new com.nugar.domain.CatalogProduct();
            catalog.setSku(product.getSku());
            catalog.setName(productDetails.getName());
            catalog.setDescription(productDetails.getDescription());
            catalog.setBrand(productDetails.getBrand());
            catalog.setImageUrl(productDetails.getImageUrl());
            
            // Map String category to Category entity
            if (productDetails.getCategory() != null && !productDetails.getCategory().isEmpty()) {
                com.nugar.domain.Category cat = categoryRepository.findFirstByNameIgnoreCase(productDetails.getCategory().trim())
                        .orElse(null);
                catalog.setCategory(cat);
            }
            catalog = catalogProductRepository.save(catalog);
        } else {
            boolean suggestsChange = false;
            if (productDetails.getName() != null && !productDetails.getName().equals(catalog.getName())) suggestsChange = true;
            if (productDetails.getDescription() != null && !productDetails.getDescription().equals(catalog.getDescription())) suggestsChange = true;
            if (productDetails.getImageUrl() != null && !productDetails.getImageUrl().equals(catalog.getImageUrl())) suggestsChange = true;
            
            if (suggestsChange) {
                com.nugar.domain.CatalogSuggestion suggestion = new com.nugar.domain.CatalogSuggestion();
                suggestion.setCompanyId(product.getCompany().getId());
                suggestion.setCompanyName(product.getCompany().getName());
                suggestion.setCatalogProduct(catalog);
                suggestion.setSuggestedName(productDetails.getName());
                suggestion.setSuggestedDescription(productDetails.getDescription());
                suggestion.setSuggestedImageUrl(productDetails.getImageUrl());
                suggestion.setStatus(com.nugar.domain.SuggestionStatus.PENDING);
                catalogSuggestionRepository.save(suggestion);
                final String catalogSku = catalog.getSku();
                BusinessLogger.log(log, "SUGERENCIA_CATALOGO", data -> {
                    data.put("usuario", userDetails.getUsername());
                    data.put("empresa", product.getCompany().getName());
                    data.put("sku", catalogSku);
                    data.put("nombreSugerido", suggestion.getSuggestedName());
                    data.put("accion", "ACTUALIZACION");
                });
            }
        }
        product.setCatalogProduct(catalog);

        // Update local fields with whatever the store manager requested
        product.setName(productDetails.getName());
        product.setDescription(productDetails.getDescription());
        product.setImageUrl(productDetails.getImageUrl());

        java.math.BigDecimal oldPrice = product.getPrice();
        java.math.BigDecimal newPrice = productDetails.getPrice();

        product.setPrice(newPrice);
        product.setCostPrice(productDetails.getCostPrice());
        product.setStock(productDetails.getStock());
        product.setMinStock(productDetails.getMinStock());

        Product updatedProduct = productRepository.save(product);
        
        if (oldPrice != null && newPrice != null && oldPrice.compareTo(newPrice) != 0) {
            BusinessLogger.log(log, "PRODUCTO_PRECIO_CAMBIADO", data -> {
                data.put("usuario", userDetails.getUsername());
                data.put("empresaId", userDetails.getCompanyId());
                data.put("productoId", updatedProduct.getId());
                data.put("nombre", updatedProduct.getName());
                data.put("sku", updatedProduct.getSku());
                data.put("precioAnterior", oldPrice);
                data.put("precioNuevo", newPrice);
            });
        } else {
            BusinessLogger.log(log, "PRODUCTO_ACTUALIZADO", data -> {
                data.put("usuario", userDetails.getUsername());
                data.put("empresaId", userDetails.getCompanyId());
                data.put("productoId", updatedProduct.getId());
                data.put("nombre", updatedProduct.getName());
                data.put("sku", updatedProduct.getSku());
                if (updatedProduct.getStock() != null) data.put("stock", updatedProduct.getStock());
            });
        }

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
            log.error("[PRODUCTO] Access denied or product not found: ID {} for company {}", id, userDetails.getCompanyId());
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Product not found or access denied."));
        }

        BusinessLogger.warn(log, "PRODUCTO_ELIMINADO", data -> {
            data.put("eliminadoPor", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("productoId", id);
            data.put("nombre", product.getName());
            data.put("sku", product.getSku());
            if (product.getPrice() != null) data.put("precio", product.getPrice());
            if (product.getStock() != null) data.put("stockActual", product.getStock());
        });
        productRepository.delete(product);

        // Remove from search engine
        productIndexService.deleteProductIndex(id);

        return ResponseEntity.ok(new MessageResponse("Product deleted successfully!"));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public ResponseEntity<?> getProductHistory(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Product product = productRepository.findById(id).orElse(null);
        if (product == null || !product.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Product not found or access denied."));
        }

        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6).withDayOfMonth(1).withHour(0).withMinute(0);
        List<com.nugar.domain.PurchaseItem> purchases = purchaseItemRepository.findValidPurchasesByProductIdSince(id, sixMonthsAgo);
        List<com.nugar.domain.SaleItem> sales = saleItemRepository.findValidSalesByProductIdSince(id, sixMonthsAgo);

        Map<String, List<com.nugar.domain.PurchaseItem>> purchasesByMonth = purchases.stream()
                .collect(Collectors.groupingBy(p -> p.getPurchase().getDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));
        Map<String, List<com.nugar.domain.SaleItem>> salesByMonth = sales.stream()
                .collect(Collectors.groupingBy(s -> s.getSale().getDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));

        List<com.nugar.payload.response.ProductHistoryResponse.MonthlyData> monthlyData = new ArrayList<>();
        
        YearMonth currentMonth = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            String monthKey = month.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            String label = month.format(DateTimeFormatter.ofPattern("MMM yy", new Locale("es", "ES")));
            
            List<com.nugar.domain.PurchaseItem> monthPurchases = purchasesByMonth.getOrDefault(monthKey, Collections.emptyList());
            List<com.nugar.domain.SaleItem> monthSales = salesByMonth.getOrDefault(monthKey, Collections.emptyList());
            
            BigDecimal avgCost = BigDecimal.ZERO;
            if (!monthPurchases.isEmpty()) {
                BigDecimal totalCostSum = monthPurchases.stream()
                        .map(p -> {
                            BigDecimal cost = p.getUnitCostInBaseCurrency() != null ? p.getUnitCostInBaseCurrency() : (p.getUnitCost() != null ? p.getUnitCost() : BigDecimal.ZERO);
                            return cost.multiply(BigDecimal.valueOf(p.getQuantity() != null ? p.getQuantity() : 1));
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                int totalQty = monthPurchases.stream().mapToInt(p -> p.getQuantity() != null ? p.getQuantity() : 1).sum();
                avgCost = totalQty > 0 ? totalCostSum.divide(BigDecimal.valueOf(totalQty), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            } else if (!monthlyData.isEmpty()) {
                avgCost = monthlyData.get(monthlyData.size() - 1).getAvgCost();
            } else {
                avgCost = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
            }

            BigDecimal avgPrice = BigDecimal.ZERO;
            if (!monthSales.isEmpty()) {
                BigDecimal totalPriceSum = monthSales.stream()
                        .map(s -> {
                            BigDecimal price = s.getUnitPrice() != null ? s.getUnitPrice() : BigDecimal.ZERO;
                            return price.multiply(BigDecimal.valueOf(s.getQuantity() != null ? s.getQuantity() : 1));
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                int totalSaleQty = monthSales.stream().mapToInt(s -> s.getQuantity() != null ? s.getQuantity() : 1).sum();
                avgPrice = totalSaleQty > 0 ? totalPriceSum.divide(BigDecimal.valueOf(totalSaleQty), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            } else if (!monthlyData.isEmpty()) {
                avgPrice = monthlyData.get(monthlyData.size() - 1).getAvgPrice();
            } else {
                avgPrice = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
            }

            // Always include all 6 months so the chart timeline is continuous.
            // Empty months inherit values from the previous month (calculated above via fallback logic).
            monthlyData.add(new com.nugar.payload.response.ProductHistoryResponse.MonthlyData(monthKey, label, avgCost, avgPrice));
        }

        com.nugar.payload.response.ProductHistoryResponse response = new com.nugar.payload.response.ProductHistoryResponse();
        response.setMonthlyData(monthlyData);
        return ResponseEntity.ok(response);
    }
}
