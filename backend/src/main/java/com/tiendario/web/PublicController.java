package com.tiendario.web;

import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.CustomerRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.service.ProductIndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import com.tiendario.payload.response.PublicProductDTO;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public")
public class PublicController {

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    ProductIndexService productIndexService;

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    SaleRepository saleRepository;

    @Autowired
    com.tiendario.repository.NotificationRepository notificationRepository;

    @Autowired
    com.tiendario.repository.GlobalConfigRepository globalConfigRepository;

    @GetMapping("/products")
    public List<PublicProductDTO> getAllProducts() {
        // Return unique products grouped by Catalog ID or normalized name
        return productRepository.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(p -> {
                    if (p.getCatalogProduct() != null) {
                        return "CAT-" + p.getCatalogProduct().getId();
                    }
                    return "NAME-" + p.getName().trim().toLowerCase();
                }))
                .values().stream()
                .map(list -> {
                    // Find product with minimum price to represent the group
                    Product bestPriceProduct = list.stream()
                            .min(java.util.Comparator.comparing(Product::getPrice))
                            .orElse(list.get(0));
                    return this.mapToDTO(bestPriceProduct);
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/products/{id}")
    public PublicProductDTO getProductDetail(@PathVariable Long id) {
        return productRepository.findById(id)
                .map(this::mapToDTO)
                .orElse(null);
    }

    @GetMapping("/products/company/{companyId}")
    public List<PublicProductDTO> getCompanyProducts(@PathVariable Long companyId) {
        return productRepository.findByCompanyId(companyId).stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/products/name/{name}/sellers")
    public List<com.tiendario.payload.response.SellerOfferDTO> getSellersByName(@PathVariable String name) {
        String normalizedName = name.trim().toLowerCase();
        return productRepository.findAll().stream()
                .filter(p -> p.getName().trim().toLowerCase().equals(normalizedName))
                .map(p -> {
                    com.tiendario.payload.response.SellerOfferDTO offer = new com.tiendario.payload.response.SellerOfferDTO();
                    offer.setProductId(p.getId());
                    offer.setCompanyId(p.getCompany().getId());
                    offer.setCompanyName(p.getCompany().getName());
                    offer.setPrice(p.getPrice());
                    offer.setStock(p.getStock());
                    offer.setSubscriptionStatus(p.getCompany().getSubscriptionStatus().name());
                    offer.setLatitude(p.getCompany().getLatitude());
                    offer.setLongitude(p.getCompany().getLongitude());
                    offer.setDescription(p.getCompany().getDescription());
                    offer.setImageUrl(p.getCompany().getImageUrl());
                    return offer;
                })
                .sorted(java.util.Comparator.comparing(com.tiendario.payload.response.SellerOfferDTO::getPrice))
                .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/search")
    public List<PublicProductDTO> searchProducts(@RequestParam String q) {
        // Try Elasticsearch first, fallback to database
        List<Product> results = productIndexService.searchProducts(q);

        // If Elasticsearch returns no results or is not available, search in database
        if (results.isEmpty()) {
            results = productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(q, q);
        }

        return results.stream()
                .collect(java.util.stream.Collectors.groupingBy(p -> {
                    if (p.getCatalogProduct() != null) {
                        return "CAT-" + p.getCatalogProduct().getId();
                    }
                    return "NAME-" + p.getName().trim().toLowerCase();
                }))
                .values().stream()
                .map(list -> {
                    Product bestPriceProduct = list.stream()
                            .min(java.util.Comparator.comparing(Product::getPrice))
                            .orElse(list.get(0));
                    return this.mapToDTO(bestPriceProduct);
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @PostMapping("/order")
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody com.tiendario.payload.request.PublicOrderRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getStock() < request.getQuantity()) {
            return ResponseEntity.badRequest()
                    .body(new com.tiendario.payload.response.MessageResponse("Insufficient stock"));
        }

        Company company = product.getCompany();
        if (company.getSubscriptionStatus() != com.tiendario.domain.SubscriptionStatus.PAID
                && company.getSubscriptionStatus() != com.tiendario.domain.SubscriptionStatus.TRIAL) {
            return ResponseEntity.badRequest().body(
                    new com.tiendario.payload.response.MessageResponse("Seller cannot accept orders (FREE Plan)"));
        }

        Customer customer = customerRepository.findByEmailAndCompanyId(request.getCustomerEmail(), company.getId())
                .orElse(new Customer());

        if (customer.getId() == null) {
            customer.setCompany(company);
            customer.setEmail(request.getCustomerEmail());
        }
        // Always update contact info from latest order
        customer.setName(request.getCustomerName());
        customer.setPhone(request.getCustomerPhone());
        customer.setAddress(request.getCustomerAddress());

        customer = customerRepository.save(customer);

        Sale sale = new Sale();
        sale.setCompany(company);
        sale.setCustomer(customer);
        sale.setDate(java.time.LocalDateTime.now());
        sale.setStatus(SaleStatus.PENDING);

        com.tiendario.domain.SaleItem item = new com.tiendario.domain.SaleItem();
        item.setProduct(product);
        item.setQuantity(request.getQuantity());
        item.setUnitPrice(product.getPrice());
        item.setSubtotal(product.getPrice().multiply(new java.math.BigDecimal(request.getQuantity())));
        item.setSale(sale);

        sale.setItems(java.util.List.of(item));
        sale.setTotalAmount(item.getSubtotal());

        product.setStock(product.getStock() - request.getQuantity());
        productRepository.save(product);

        saleRepository.save(sale);

        // Create Notification for the seller
        com.tiendario.domain.Notification notification = new com.tiendario.domain.Notification();
        notification.setCompany(company);
        notification.setReferenceId(sale.getId());
        notification.setType("SALE");
        notification.setTitle("¡Nueva Venta!");
        notification.setMessage("Has recibido un pedido de " + customer.getName() + " por $" + sale.getTotalAmount());
        notification.setCreatedAt(java.time.LocalDateTime.now());
        notification.setReadStatus(false);
        notificationRepository.save(notification);

        // Update Loyalty Points (1 point per $1)
        if (customer.getLoyaltyPoints() == null)
            customer.setLoyaltyPoints(0);
        customer.setLoyaltyPoints(customer.getLoyaltyPoints() + sale.getTotalAmount().intValue());
        customerRepository.save(customer);

        return ResponseEntity.ok(new com.tiendario.payload.response.MessageResponse(
                "Order placed successfully! Order ID: " + sale.getId()));
    }

    @GetMapping("/config")
    public ResponseEntity<?> getPublicConfig() {
        return ResponseEntity.ok(globalConfigRepository.findFirstByOrderByIdAsc()
                .map(config -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("announcementMessage", config.getAnnouncementMessage());
                    map.put("maintenanceMode", config.isMaintenanceMode());
                    map.put("contactEmail", config.getContactEmail());
                    map.put("contactPhone", config.getContactPhone());
                    map.put("exchangeRate", config.getExchangeRate());
                    map.put("enableSecondaryCurrency", config.isEnableSecondaryCurrency());
                    map.put("secondaryCurrencyLabel", config.getSecondaryCurrencyLabel());
                    map.put("secondaryCurrencySymbol", config.getSecondaryCurrencySymbol());
                    return map;
                })
                .orElseGet(() -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("announcementMessage", "");
                    map.put("maintenanceMode", false);
                    map.put("enableSecondaryCurrency", false);
                    return map;
                }));
    }

    @GetMapping("/customer/points")
    public ResponseEntity<?> getCustomerPoints(@RequestParam String email) {
        // Simple aggregate of points for this email across all companies
        Integer totalPoints = customerRepository.findAll().stream()
                .filter(c -> c.getEmail().equalsIgnoreCase(email))
                .mapToInt(c -> c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0)
                .sum();

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("email", email);
        response.put("points", totalPoints);
        return ResponseEntity.ok(response);
    }

    private PublicProductDTO mapToDTO(Product product) {
        com.tiendario.payload.response.PublicProductDTO dto = new com.tiendario.payload.response.PublicProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setStock(product.getStock());
        dto.setImageUrl(product.getImageUrl());
        dto.setSku(product.getSku());

        if (product.getCompany() != null) {
            dto.setCompanyId(product.getCompany().getId());
            dto.setCompanyName(product.getCompany().getName());
            if (product.getCompany().getSubscriptionStatus() != null) {
                dto.setSubscriptionStatus(product.getCompany().getSubscriptionStatus().name());
            } else {
                dto.setSubscriptionStatus("FREE");
            }
        }
        if (product.getCategory() != null) {
            dto.setCategory(product.getCategory());
        } else if (product.getCatalogProduct() != null && product.getCatalogProduct().getCategory() != null) {
            dto.setCategory(product.getCatalogProduct().getCategory().getName());
        }
        return dto;
    }
}
