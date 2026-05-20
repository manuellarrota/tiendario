package com.nugar.web;

import com.nugar.domain.*;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.*;
import com.nugar.service.EmailService;
import com.nugar.service.SubscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/superadmin")
public class SuperAdminController {

        private static final Logger log = LoggerFactory.getLogger(SuperAdminController.class);

        @Autowired
        CompanyRepository companyRepository;

        @Autowired
        UserRepository userRepository;

        @Autowired
        ProductRepository productRepository;

        @Autowired
        SaleRepository saleRepository;

        @Autowired
        SubscriptionPaymentRepository paymentRepository;

        @Autowired
        SubscriptionService subscriptionService;

        @Autowired
        EmailService emailService;

        @Autowired
        GlobalConfigRepository configRepository;

        @Autowired
        CatalogProductRepository catalogProductRepository;

        @Autowired
        CategoryRepository categoryRepository;

        @Autowired
        PasswordEncoder passwordEncoder;

        @Autowired
        com.nugar.service.ExchangeRateService exchangeRateService;

        @PostMapping("/config/refresh-rates")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> refreshExchangeRates() {
                exchangeRateService.updateRates();
                return ResponseEntity.ok(new MessageResponse("Tasas actualizadas exitosamente"));
        }

        @GetMapping("/stats")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getGlobalStats() {
                Map<String, Object> stats = new HashMap<>();

                // 1. Total Tenants
                long totalCompanies = companyRepository.count();
                stats.put("totalCompanies", totalCompanies);

                // 2. Total Users
                long totalUsers = userRepository.count();
                stats.put("totalUsers", totalUsers);

                // 3. Subscription Breakdown
                List<Company> allCompanies = companyRepository.findAll();
                long trialPlanCount = allCompanies.stream()
                                .filter(c -> SubscriptionStatus.TRIAL.equals(c.getSubscriptionStatus()))
                                .count();
                long paidPlanCount = allCompanies.stream()
                                .filter(c -> SubscriptionStatus.PAID.equals(c.getSubscriptionStatus()))
                                .count();

                stats.put("trialPlanCount", trialPlanCount);
                stats.put("paidPlanCount", paidPlanCount);

                // 4. Global Revenue (Sales)
                List<Sale> allSales = saleRepository.findAll();
                BigDecimal globalGmv = allSales.stream()
                                .map(Sale::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                stats.put("globalGmv", globalGmv);

                // 5. Total Products in Marketplace
                long totalProducts = productRepository.count();
                stats.put("totalProducts", totalProducts);

                // 6. MRR Estimation
                com.nugar.domain.GlobalConfig config = configRepository.findFirstByOrderByIdAsc()
                                .orElse(new com.nugar.domain.GlobalConfig());
                BigDecimal mrr = config.getPremiumPlanMonthlyPrice().multiply(BigDecimal.valueOf(paidPlanCount));
                stats.put("mrr", mrr);

                // 7. Active Shops
                java.time.LocalDateTime thirtyDaysAgo = java.time.LocalDateTime.now().minusDays(30);
                Long activeShops = saleRepository.countActiveCompaniesSince(thirtyDaysAgo);
                stats.put("activeShops", activeShops != null ? activeShops : 0);

                // 8. Total Global Orders
                long totalOrders = saleRepository.count();
                stats.put("totalOrders", totalOrders);

                // 9. Average Order Value
                BigDecimal aov = totalOrders > 0
                                ? globalGmv.divide(BigDecimal.valueOf(totalOrders), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                stats.put("globalAov", aov);

                // 10. Conversion Rate
                double conversionRate = totalCompanies > 0 ? (double) paidPlanCount / totalCompanies * 100 : 0;
                stats.put("conversionRate", Math.round(conversionRate * 100.0) / 100.0);

                return ResponseEntity.ok(stats);
        }

        @GetMapping("/companies")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllCompanies() {
                return ResponseEntity.ok(companyRepository.findAll());
        }

        @PutMapping("/companies/{id}")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateCompany(@PathVariable Long id, @RequestBody Company companyDetails) {
                Company company = companyRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Company not found"));
                company.setName(companyDetails.getName());
                company.setLatitude(companyDetails.getLatitude());
                company.setLongitude(companyDetails.getLongitude());
                company.setDescription(companyDetails.getDescription());
                company.setAddress(companyDetails.getAddress());
                companyRepository.save(company);
                return ResponseEntity.ok(new MessageResponse("Company updated successfully"));
        }

        @PutMapping("/companies/{id}/subscription")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateCompanySubscription(@PathVariable Long id,
                        @RequestBody Map<String, Object> request) {
                Company company = companyRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                String newStatus = (String) request.get("status");
                String newPlan = (String) request.get("plan");
                Boolean hasElectronicBilling = (Boolean) request.get("hasElectronicBilling");
                Integer extraRegisters = request.get("extraRegisters") != null ? Integer.valueOf(request.get("extraRegisters").toString()) : 0;

                try {
                        if (newStatus != null) company.setSubscriptionStatus(SubscriptionStatus.valueOf(newStatus));
                        if (newPlan != null) company.setSubscriptionPlan(SubscriptionPlan.valueOf(newPlan));
                        if (hasElectronicBilling != null) company.setHasElectronicBilling(hasElectronicBilling);
                        company.setExtraRegisters(extraRegisters);
                        
                        companyRepository.save(company);
                        log.info("[SUSCRIPCIÓN ACTUALIZADA] Estado: {} | Plan: {} | Cajas Extra: {} | Empresa: {} (ID: {})", 
                                newStatus, newPlan, extraRegisters, company.getName(), company.getId());
                        return ResponseEntity.ok(new MessageResponse("Subscription updated successfully!"));
                } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Invalid subscription status or plan"));
                }
        }

        @GetMapping("/users")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllUsers() {
                return ResponseEntity.ok(userRepository.findAll());
        }

        @GetMapping("/payments")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllPayments() {
                return ResponseEntity.ok(paymentRepository.findAll());
        }

        @PostMapping("/payments/{id}/approve")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> approvePayment(@PathVariable Long id) {
                subscriptionService.approvePayment(id);
                return ResponseEntity.ok(new MessageResponse("Payment approved successfully"));
        }

        @PostMapping("/payments/{id}/reject")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> rejectPayment(@PathVariable Long id, @RequestBody Map<String, String> request) {
                String reason = request.get("reason");
                subscriptionService.rejectPayment(id, reason);
                return ResponseEntity.ok(new MessageResponse("Payment rejected"));
        }

        @PutMapping("/users/{id}/toggle")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> toggleUser(@PathVariable Long id) {
                User user = userRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                user.setEnabled(!user.isEnabled());
                userRepository.save(user);
                return ResponseEntity.ok(new MessageResponse("User status toggled successfully"));
        }

        @GetMapping("/config")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getConfig() {
                return ResponseEntity.ok(configRepository.findFirstByOrderByIdAsc()
                                .orElseGet(() -> configRepository.save(new com.nugar.domain.GlobalConfig())));
        }

        @PutMapping("/config")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateConfig(@RequestBody com.nugar.domain.GlobalConfig newConfig) {
                com.nugar.domain.GlobalConfig current = configRepository.findFirstByOrderByIdAsc()
                                .orElseGet(() -> new com.nugar.domain.GlobalConfig());

                current.setFreePlanProductLimit(newConfig.getFreePlanProductLimit());
                current.setPremiumPlanMonthlyPrice(newConfig.getPremiumPlanMonthlyPrice());
                current.setTrialDays(newConfig.getTrialDays());
                current.setMaintenanceMode(newConfig.isMaintenanceMode());
                current.setAnnouncementMessage(newConfig.getAnnouncementMessage());
                current.setContactEmail(newConfig.getContactEmail());
                current.setContactPhone(newConfig.getContactPhone());
                current.setExchangeRate(newConfig.getExchangeRate());
                current.setEnableSecondaryCurrency(newConfig.isEnableSecondaryCurrency());
                current.setSecondaryCurrencyLabel(newConfig.getSecondaryCurrencyLabel());
                current.setSecondaryCurrencySymbol(newConfig.getSecondaryCurrencySymbol());
                current.setBaseCurrencyCode(newConfig.getBaseCurrencyCode());
                current.setBaseCurrencySymbol(newConfig.getBaseCurrencySymbol());
                current.setCurrencies(newConfig.getCurrencies());

                configRepository.save(current);
                return ResponseEntity.ok(new MessageResponse("Configuration updated successfully"));
        }

        @GetMapping("/catalog")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllCatalogProducts() {
                return ResponseEntity.ok(catalogProductRepository.findAll());
        }

        @PutMapping("/catalog/{id}")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateCatalogProduct(@PathVariable Long id, @RequestBody CatalogProduct details) {
                CatalogProduct cp = catalogProductRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Catalog product not found"));
                cp.setName(details.getName());
                cp.setDescription(details.getDescription());
                cp.setImageUrl(details.getImageUrl());

                if (details.getCategory() != null && details.getCategory().getName() != null) {
                        Category cat = categoryRepository.findFirstByNameIgnoreCase(details.getCategory().getName().trim())
                                        .orElse(null);
                        cp.setCategory(cat);
                } else {
                        cp.setCategory(null);
                }

                return ResponseEntity.ok(catalogProductRepository.save(cp));
        }

        @DeleteMapping("/catalog/{id}")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> deleteCatalogProduct(@PathVariable Long id) {
                catalogProductRepository.deleteById(id);
                return ResponseEntity.ok(new MessageResponse("Catalog item deleted"));
        }

        @PostMapping("/onboard/create-store")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> createStore(@RequestBody Map<String, Object> body) {
                String companyName = (String) body.get("companyName");
                String username = (String) body.get("username");
                String email = (String) body.get("email");
                String password = (String) body.get("password");
                String phone = (String) body.getOrDefault("phoneNumber", "");
                String description = (String) body.getOrDefault("description", "");
                String planStr = (String) body.getOrDefault("subscriptionStatus", "TRIAL");
                Double lat = body.get("latitude") != null ? ((Number) body.get("latitude")).doubleValue() : 0.0;
                Double lng = body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : 0.0;
                String address = (String) body.getOrDefault("address", "");

                if (userRepository.existsByUsername(username)) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Error: El usuario ya existe."));
                }
                if (userRepository.existsByEmail(email)) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Error: El email ya existe."));
                }

                try {
                        Company company = new Company();
                        company.setName(companyName);
                        company.setPhoneNumber(phone);
                        company.setDescription(description);
                        company.setLatitude(lat);
                        company.setLongitude(lng);
                        company.setAddress(address);

                        SubscriptionStatus plan;
                        try {
                                plan = SubscriptionStatus.valueOf(planStr);
                        } catch (Exception e) {
                                plan = SubscriptionStatus.TRIAL;
                        }
                        company.setSubscriptionStatus(plan);
                        if (plan == SubscriptionStatus.TRIAL) {
                                company.setTrialStartDate(LocalDateTime.now());
                                company.setSubscriptionEndDate(LocalDateTime.now().plusDays(30));
                        }
                        companyRepository.save(company);

                        User user = new User();
                        user.setUsername(username);
                        user.setEmail(email);
                        user.setPassword(passwordEncoder.encode(password));
                        user.setRole(Role.ROLE_MANAGER);
                        user.setEnabled(true);
                        user.setCompany(company);
                        userRepository.save(user);

                        log.info("[TIENDA ONBOARDING] Nueva tienda: {} | Gestor: {}", company.getName(), user.getUsername());

                        try {
                                emailService.sendStoreCredentials(email, company.getName(), username, password);
                        } catch (Exception e) {}

                        Map<String, Object> result = new HashMap<>();
                        result.put("companyId", company.getId());
                        result.put("companyName", company.getName());
                        result.put("message", "Tienda creada exitosamente.");
                        return ResponseEntity.ok(result);
                } catch (Exception e) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Error al crear tienda: " + e.getMessage()));
                }
        }

        @PostMapping("/categories/global")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> addGlobalCategory(@RequestBody Map<String, String> body) {
                String catName = body.get("name");
                if (catName == null || catName.trim().isEmpty()) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Nombre requerido."));
                }

                Category cat = categoryRepository.findFirstByNameIgnoreCase(catName.trim())
                                .orElseGet(() -> {
                                        Category newCat = new Category();
                                        newCat.setName(catName.trim());
                                        newCat.setDescription(body.getOrDefault("description", ""));
                                        return categoryRepository.save(newCat);
                                });
                return ResponseEntity.ok(cat);
        }

        @PostMapping("/onboard/{companyId}/products")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> addProductToCompany(@PathVariable Long companyId, @RequestBody Map<String, Object> body) {
                Company company = companyRepository.findById(companyId).orElse(null);
                if (company == null) return ResponseEntity.badRequest().body(new MessageResponse("Empresa no encontrada."));

                String sku = (String) body.get("sku");
                String name = (String) body.get("name");
                String catName = (String) body.getOrDefault("category", "");

                Category category = catName.isEmpty() ? null : categoryRepository.findFirstByNameIgnoreCase(catName.trim()).orElse(null);

                CatalogProduct catalogProduct = null;
                if (sku != null && !sku.trim().isEmpty()) {
                        catalogProduct = catalogProductRepository.findBySku(sku.trim())
                                        .orElseGet(() -> {
                                                CatalogProduct cp = new CatalogProduct();
                                                cp.setSku(sku.trim());
                                                cp.setName(name);
                                                cp.setCategory(category);
                                                return catalogProductRepository.save(cp);
                                        });
                }

                Product p = new Product();
                p.setName(name);
                p.setSku(sku != null ? sku.trim() : "");
                p.setCategory(catName);
                p.setPrice(new BigDecimal(body.get("price").toString()));
                p.setStock(Integer.parseInt(body.get("stock").toString()));
                p.setCompany(company);
                p.setCatalogProduct(catalogProduct);

                productRepository.save(p);
                return ResponseEntity.ok(p);
        }

        @GetMapping("/categories/global")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllGlobalCategories() {
                return ResponseEntity.ok(categoryRepository.findAll().stream()
                        .map(Category::getName)
                        .distinct()
                        .collect(java.util.stream.Collectors.toList()));
        }
}
