package com.tiendario.web;

import com.tiendario.domain.*;
import com.tiendario.payload.request.PublicOrderRequest;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.payload.response.PublicProductDTO;
import com.tiendario.payload.response.SellerOfferDTO;
import com.tiendario.repository.*;
import com.tiendario.domain.Category;
import com.tiendario.service.EmailService;
import com.tiendario.service.ProductIndexService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
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
    NotificationRepository notificationRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    EmailService emailService;

    @Autowired
    GlobalConfigRepository globalConfigRepository;

    @Autowired
    CategoryRepository categoryRepository;

    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(defaultValue = "relevant") String sortBy,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {

        // Note: For complex grouping (best price per SKU/Name), we still need to process.
        // But we can filter by category at the database level first.
        List<Product> allProducts;
        if (category != null && !category.equalsIgnoreCase("all")) {
            allProducts = productRepository.findAll().stream()
                    .filter(p -> p.getCategory() != null && p.getCategory().equalsIgnoreCase(category))
                    .collect(Collectors.toList());
        } else {
            allProducts = productRepository.findAll();
        }

        if (q != null && !q.trim().isEmpty()) {
            String query = q.toLowerCase();
            allProducts = allProducts.stream()
                    .filter(p -> p.getName().toLowerCase().contains(query) || (p.getDescription() != null && p.getDescription().toLowerCase().contains(query)))
                    .collect(Collectors.toList());
        }

        if (minPrice != null) {
            allProducts = allProducts.stream()
                    .filter(p -> p.getPrice().compareTo(minPrice) >= 0)
                    .collect(Collectors.toList());
        }
        if (maxPrice != null) {
            allProducts = allProducts.stream()
                    .filter(p -> p.getPrice().compareTo(maxPrice) <= 0)
                    .collect(Collectors.toList());
        }

        if (minRating != null) {
            allProducts = allProducts.stream()
                    .filter(p -> p.getCompany() != null && p.getCompany().getRating() != null && p.getCompany().getRating() >= minRating)
                    .collect(Collectors.toList());
        }

        List<PublicProductDTO> groupedProducts = allProducts.stream()
                .collect(Collectors.groupingBy(p -> {
                    if (p.getSku() != null && !p.getSku().trim().isEmpty()) {
                        return "SKU-" + p.getSku().trim().toUpperCase();
                    }
                    if (p.getCatalogProduct() != null) {
                        return "CAT-" + p.getCatalogProduct().getId();
                    }
                    return "NAME-" + p.getName().trim().toLowerCase();
                }))
                .values().stream()
                .map(list -> {
                    Product representative;
                    if ("proximity".equals(sortBy) && lat != null && lon != null) {
                        // Pick nearest seller
                        representative = list.stream()
                                .min(Comparator.comparing(p -> calculateDistance(lat, lon, 
                                    p.getCompany().getLatitude(), p.getCompany().getLongitude())))
                                .orElse(list.get(0));
                    } else {
                        // Default to best price
                        representative = list.stream()
                                .min(Comparator.comparing(Product::getPrice))
                                .orElse(list.get(0));
                    }
                    return this.mapToDTO(representative, lat, lon);
                })
                .sorted((a, b) -> {
                    if ("proximity".equals(sortBy) && a.getDistance() != null && b.getDistance() != null) {
                        return a.getDistance().compareTo(b.getDistance());
                    }
                    if ("price_low".equals(sortBy)) return a.getPrice().compareTo(b.getPrice());
                    if ("price_high".equals(sortBy)) return b.getPrice().compareTo(a.getPrice());
                    return a.getName().compareTo(b.getName());
                })
                .collect(Collectors.toList());

        int totalItems = groupedProducts.size();
        int start = Math.min(page * size, totalItems);
        int end = Math.min((page + 1) * size, totalItems);
        
        List<PublicProductDTO> pageContent = groupedProducts.subList(start, end);

        Map<String, Object> response = new HashMap<>();
        response.put("products", pageContent);
        response.put("currentPage", page);
        response.put("totalItems", totalItems);
        response.put("totalPages", (int) Math.ceil((double) totalItems / size));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/{id}")
    public PublicProductDTO getProductDetail(@PathVariable Long id, 
            @RequestParam(required = false) Double lat, 
            @RequestParam(required = false) Double lon) {
        return productRepository.findById(id)
                .map(p -> this.mapToDTO(p, lat, lon))
                .orElse(null);
    }

    @GetMapping("/products/company/{companyId}")
    public List<PublicProductDTO> getCompanyProducts(@PathVariable Long companyId) {
        return productRepository.findByCompanyId(companyId).stream()
                .map(p -> this.mapToDTO(p, null, null))
                .collect(Collectors.toList());
    }

    @GetMapping("/products/name/{name}/sellers")
    public List<SellerOfferDTO> getSellersByName(@PathVariable String name,
            @RequestParam(required = false) String sku,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        String normalizedName = name.trim().toLowerCase();
        String normalizedSku = sku != null ? sku.trim().toUpperCase() : null;

        return productRepository.findAll().stream()
                .filter(p -> {
                    if (normalizedSku != null && p.getSku() != null) {
                        return p.getSku().trim().toUpperCase().equals(normalizedSku);
                    }
                    return p.getName().trim().toLowerCase().equals(normalizedName);
                })
                .map(p -> {
                    SellerOfferDTO offer = new SellerOfferDTO();
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

                    if (lat != null && lon != null && p.getCompany().getLatitude() != 0.0) {
                        offer.setDistance(calculateDistance(lat, lon, 
                            p.getCompany().getLatitude(), p.getCompany().getLongitude()));
                    }
                    return offer;
                })
                .sorted((a, b) -> {
                    if (lat != null && lon != null && a.getDistance() != null && b.getDistance() != null) {
                        return a.getDistance().compareTo(b.getDistance());
                    }
                    return a.getPrice().compareTo(b.getPrice());
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/search")
    public List<PublicProductDTO> searchProducts(@RequestParam String q,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        List<Product> results = productIndexService.searchProducts(q);

        if (results.isEmpty()) {
            results = productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(q, q);
        }

        return results.stream()
                .collect(Collectors.groupingBy(p -> {
                    if (p.getSku() != null && !p.getSku().trim().isEmpty()) {
                        return "SKU-" + p.getSku().trim().toUpperCase();
                    }
                    if (p.getCatalogProduct() != null) {
                        return "CAT-" + p.getCatalogProduct().getId();
                    }
                    return "NAME-" + p.getName().trim().toLowerCase();
                }))
                .values().stream()
                .map(list -> {
                    Product bestPriceProduct = list.stream()
                            .min(Comparator.comparing(Product::getPrice))
                            .orElse(list.get(0));
                    return this.mapToDTO(bestPriceProduct, lat, lon);
                })
                .collect(Collectors.toList());
    }

    @PostMapping("/order")
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody PublicOrderRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Cantidad de productos inválida. Debe ser mayor a cero."));
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (product.getStock() < request.getQuantity()) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Insufficient stock"));
        }

        Company company = product.getCompany();
        if (company.getSubscriptionStatus() != SubscriptionStatus.PAID
                && company.getSubscriptionStatus() != SubscriptionStatus.TRIAL) {
            return ResponseEntity.badRequest().body(
                    new MessageResponse("Seller cannot accept orders (Restricted Plan)"));
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
        sale.setCustomerName(request.getCustomerName());
        sale.setCustomerEmail(request.getCustomerEmail());
        sale.setCustomerPhone(request.getCustomerPhone());
        sale.setDate(LocalDateTime.now());
        sale.setStatus(SaleStatus.PENDING);

        SaleItem item = new SaleItem();
        item.setProduct(product);
        item.setQuantity(request.getQuantity());
        item.setUnitPrice(product.getPrice());
        item.setSubtotal(product.getPrice().multiply(new BigDecimal(request.getQuantity())));
        item.setSale(sale);

        sale.setItems(List.of(item));
        sale.setTotalAmount(item.getSubtotal());

        product.setStock(product.getStock() - request.getQuantity());
        productRepository.save(product);

        saleRepository.save(sale);

        // Create Notification for the seller
        Notification notification = new Notification();
        notification.setCompany(company);
        notification.setReferenceId(sale.getId());
        notification.setType("SALE");
        notification.setTitle("¡Nueva Venta!");
        notification.setMessage("Has recibido un pedido de " + customer.getName() + " por $" + sale.getTotalAmount());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setReadStatus(false);
        notificationRepository.save(notification);

        // Send email notification to store manager(s)
        try {
            List<User> managers = userRepository.findByCompanyIdAndRole(
                    company.getId(), Role.ROLE_MANAGER);
            String orderSummary = request.getQuantity() + "x " + product.getName();
            for (User mgr : managers) {
                if (mgr.getEmail() != null) {
                    emailService.sendNewOrderNotification(
                            mgr.getEmail(), company.getName(),
                            request.getCustomerName(),
                            orderSummary, sale.getTotalAmount().doubleValue());
                }
            }
        } catch (Exception e) {
            log.error("Failed to send order notification email", e);
        }

        // Update Loyalty Points (1 point per $1)
        if (customer.getLoyaltyPoints() == null)
            customer.setLoyaltyPoints(0);
        customer.setLoyaltyPoints(customer.getLoyaltyPoints() + sale.getTotalAmount().intValue());
        customerRepository.save(customer);

        return ResponseEntity.ok(new MessageResponse(
                "Order placed successfully! Order ID: " + sale.getId()));
    }

    @GetMapping("/categories")
    public List<Category> getPublicCategories() {
        return categoryRepository.findAll();
    }

    @GetMapping("/config")
    public ResponseEntity<?> getPublicConfig() {
        return ResponseEntity.ok(globalConfigRepository.findFirstByOrderByIdAsc()
                .map(config -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("announcementMessage", config.getAnnouncementMessage());
                    map.put("maintenanceMode", config.isMaintenanceMode());
                    map.put("contactEmail", config.getContactEmail());
                    map.put("contactPhone", config.getContactPhone());
                    map.put("exchangeRate", config.getExchangeRate());
                    map.put("enableSecondaryCurrency", config.isEnableSecondaryCurrency());
                    map.put("secondaryCurrencyLabel", config.getSecondaryCurrencyLabel());
                    map.put("secondaryCurrencySymbol", config.getSecondaryCurrencySymbol());
                    map.put("baseCurrencyCode", config.getBaseCurrencyCode());
                    map.put("baseCurrencySymbol", config.getBaseCurrencySymbol());
                    map.put("currencies", config.getCurrencies());
                    return map;
                })
                .orElseGet(() -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("announcementMessage", "");
                    map.put("maintenanceMode", false);
                    map.put("enableSecondaryCurrency", true);
                    map.put("baseCurrencyCode", "USD");
                    map.put("baseCurrencySymbol", "$");
                    map.put("currencies", "[{\"code\":\"COP\",\"symbol\":\"$\",\"name\":\"Peso Colombiano\",\"rate\":4200.00,\"enabled\":true},{\"code\":\"VES\",\"symbol\":\"Bs.\",\"name\":\"Bolívar\",\"rate\":36.50,\"enabled\":true}]");
                    return map;
                }));
    }

    @GetMapping("/customer/points")
    public ResponseEntity<?> getCustomerPoints(@RequestParam String email) {
        Integer totalPoints = customerRepository.findAll().stream()
                .filter(c -> c.getEmail().equalsIgnoreCase(email))
                .mapToInt(c -> c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0)
                .sum();

        Map<String, Object> response = new HashMap<>();
        response.put("email", email);
        response.put("points", totalPoints);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stores/nearby")
    public List<Company> getNearbyStores(@RequestParam double lat, @RequestParam double lon) {
        // ~10km bounding box (approx 0.1 deg)
        double offset = 0.1;
        return companyRepository.findByLatitudeBetweenAndLongitudeBetween(
                lat - offset, lat + offset, lon - offset, lon + offset);
    }

    private PublicProductDTO mapToDTO(Product product, Double userLat, Double userLon) {
        PublicProductDTO dto = new PublicProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setStock(product.getStock());
        dto.setImageUrl(product.getImageUrl());
        dto.setSku(product.getSku());
        dto.setBrand(product.getBrand());

        if (product.getCompany() != null) {
            dto.setCompanyId(product.getCompany().getId());
            dto.setCompanyName(product.getCompany().getName());
            if (product.getCompany().getSubscriptionStatus() != null) {
                dto.setSubscriptionStatus(product.getCompany().getSubscriptionStatus().name());
            } else {
                dto.setSubscriptionStatus("TRIAL");
            }
            dto.setRating(product.getCompany().getRating());
            dto.setRatingCount(product.getCompany().getRatingCount());

            // Calculate distance if both company and user coordinates are available
            if (userLat != null && userLon != null && product.getCompany().getLatitude() != 0.0) {
                dto.setDistance(calculateDistance(userLat, userLon, 
                    product.getCompany().getLatitude(), product.getCompany().getLongitude()));
            }
        }
        if (product.getCategory() != null) {
            dto.setCategory(product.getCategory());
        } else if (product.getCatalogProduct() != null && product.getCatalogProduct().getCategory() != null) {
            dto.setCategory(product.getCatalogProduct().getCategory().getName());
        }
        return dto;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }
}
