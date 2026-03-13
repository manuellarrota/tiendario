package com.tiendario.web;

import com.tiendario.domain.*;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.*;
import com.tiendario.service.EmailService;
import com.tiendario.service.SubscriptionService;
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
                long freePlanCount = allCompanies.stream()
                                .filter(c -> SubscriptionStatus.FREE.equals(c.getSubscriptionStatus()))
                                .count();
                long paidPlanCount = allCompanies.stream()
                                .filter(c -> SubscriptionStatus.PAID.equals(c.getSubscriptionStatus()))
                                .count();

                stats.put("freePlanCount", freePlanCount);
                stats.put("paidPlanCount", paidPlanCount);

                // 4. Global Revenue (Sales) - This is GMV (Gross Merchandise Value) of the
                // platform
                List<Sale> allSales = saleRepository.findAll();
                BigDecimal globalGmv = allSales.stream()
                                .map(Sale::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                stats.put("globalGmv", globalGmv);

                // 5. Total Products in Marketplace
                long totalProducts = productRepository.count();
                stats.put("totalProducts", totalProducts);

                // 6. MRR Estimation (Monthly Recurring Revenue)
                com.tiendario.domain.GlobalConfig config = configRepository.findFirstByOrderByIdAsc()
                                .orElse(new com.tiendario.domain.GlobalConfig());
                BigDecimal mrr = config.getPremiumPlanMonthlyPrice().multiply(BigDecimal.valueOf(paidPlanCount));
                stats.put("mrr", mrr);

                // 7. Active Shops (Last 30 days based on sales)
                java.time.LocalDateTime thirtyDaysAgo = java.time.LocalDateTime.now().minusDays(30);
                Long activeShops = saleRepository.countActiveCompaniesSince(thirtyDaysAgo);
                stats.put("activeShops", activeShops != null ? activeShops : 0);

                // 8. Total Global Orders
                long totalOrders = saleRepository.count();
                stats.put("totalOrders", totalOrders);

                // 9. Average Order Value (Global AOV)
                BigDecimal aov = totalOrders > 0
                                ? globalGmv.divide(BigDecimal.valueOf(totalOrders), 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                stats.put("globalAov", aov);

                // 10. Conversion Rate (Paid / Total)
                double conversionRate = totalCompanies > 0 ? (double) paidPlanCount / totalCompanies * 100 : 0;
                stats.put("conversionRate", Math.round(conversionRate * 100.0) / 100.0);

                // 11. Potential Churn (No sales in last 15 days)
                java.time.LocalDateTime fifteenDaysAgo = java.time.LocalDateTime.now().minusDays(15);
                List<Long> companiesWithRecentSales = saleRepository.findUniqueCompanyIdsSince(fifteenDaysAgo);
                long churnedShops = totalCompanies - companiesWithRecentSales.size();
                stats.put("churnedShops", churnedShops);

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
                company.setImageUrl(companyDetails.getImageUrl());
                companyRepository.save(company);
                return ResponseEntity.ok(new MessageResponse("Company updated successfully"));
        }

        @PutMapping("/companies/{id}/subscription")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateCompanySubscription(@PathVariable Long id,
                        @RequestBody Map<String, String> request) {
                Company company = companyRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Company not found"));

                String newStatus = request.get("status");
                if (newStatus != null) {
                        try {
                                company.setSubscriptionStatus(SubscriptionStatus.valueOf(newStatus));
                                companyRepository.save(company);
                                return ResponseEntity
                                                .ok(new MessageResponse(
                                                                "Subscription updated successfully!"));
                        } catch (IllegalArgumentException e) {
                                return ResponseEntity.badRequest()
                                                .body(new MessageResponse(
                                                                "Invalid subscription status"));
                        }
                }
                return ResponseEntity.badRequest()
                                .body(new MessageResponse("Status is required"));
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
                return ResponseEntity.ok(
                                new MessageResponse("Payment approved successfully"));
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
                return ResponseEntity.ok(new MessageResponse(
                                "User " + (user.isEnabled() ? "enabled" : "disabled") + " successfully"));
        }

        @GetMapping("/config")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getConfig() {
                return ResponseEntity.ok(configRepository.findFirstByOrderByIdAsc()
                                .orElseGet(() -> configRepository.save(new com.tiendario.domain.GlobalConfig())));
        }

        @PutMapping("/config")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> updateConfig(@RequestBody com.tiendario.domain.GlobalConfig newConfig) {
                com.tiendario.domain.GlobalConfig current = configRepository.findFirstByOrderByIdAsc()
                                .orElseGet(() -> new com.tiendario.domain.GlobalConfig());

                // Update only editable fields
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

                configRepository.save(current);
                return ResponseEntity.ok(new MessageResponse("Configuration updated successfully"));
        }

        // --- CATALOG MANAGEMENT ---

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

                // Update category if provided
                if (details.getCategory() != null && details.getCategory().getName() != null) {
                        Category cat = categoryRepository.findFirstByNameIgnoreCase(details.getCategory().getName().trim())
                                        .orElse(null);
                        cp.setCategory(cat);
                } else {
                        cp.setCategory(null);
                }

                CatalogProduct saved = catalogProductRepository.save(cp);

                // Optional: Trigger a background task to sync all local products or just rely
                // on the link
                return ResponseEntity.ok(saved);
        }

        @DeleteMapping("/catalog/{id}")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> deleteCatalogProduct(@PathVariable Long id) {
                catalogProductRepository.deleteById(id);
                return ResponseEntity.ok(new MessageResponse("Catalog item deleted"));
        }

        // ─── ONBOARDING DE TIENDAS
        // ────────────────────────────────────────────────────

        /**
         * Paso 1 del onboarding: Crea empresa + usuario gestor, activado directamente.
         * Body: { companyName, username, email, password, phoneNumber, latitude,
         * longitude, description, subscriptionStatus }
         */
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

                if (userRepository.existsByUsername(username)) {
                        return ResponseEntity.badRequest()
                                        .body(new MessageResponse("Error: El nombre de usuario ya está en uso."));
                }
                if (userRepository.existsByEmail(email)) {
                        return ResponseEntity.badRequest()
                                        .body(new MessageResponse("Error: El correo electrónico ya está registrado."));
                }

                // Crear empresa
                Company company = new Company();
                company.setName(companyName);
                company.setPhoneNumber(phone);
                company.setDescription(description);
                company.setLatitude(lat);
                company.setLongitude(lng);

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

                // Crear usuario gestor (activado directamente — el CEO lo registra en persona)
                User user = new User();
                user.setUsername(username);
                user.setEmail(email);
                user.setPassword(passwordEncoder.encode(password));
                user.setRole(Role.ROLE_MANAGER);
                user.setEnabled(true); // Activado inmediatamente
                user.setCompany(company);
                userRepository.save(user);

                // Enviar credenciales
                try {
                        emailService.sendStoreCredentials(email, company.getName(), username, password);
                } catch (Exception e) {
                        e.printStackTrace();
                }

                Map<String, Object> result = new HashMap<>();
                result.put("companyId", company.getId());
                result.put("userId", user.getId());
                result.put("companyName", company.getName());
                result.put("message", "Tienda creada exitosamente.");
                return ResponseEntity.ok(result);
        }

        /**
         * Paso 2: Agregar una categoría global.
         * Body: { name, description }
         */
        @PostMapping("/categories/global")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> addGlobalCategory(@RequestBody Map<String, String> body) {
                String catName = body.get("name");
                if (catName == null || catName.trim().isEmpty()) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Nombre de categoría requerido."));
                }

                Category cat = categoryRepository.findFirstByNameIgnoreCase(catName.trim()).orElse(null);
                if (cat == null) {
                        cat = new Category();
                        cat.setName(catName.trim());
                        cat.setDescription(body.getOrDefault("description", ""));
                        cat = categoryRepository.save(cat);
                }
                return ResponseEntity.ok(cat);
        }

        /**
         * Paso 3: Agregar un producto al inventario de una empresa específica.
         * Se vincula automáticamente al catálogo global por SKU.
         * Body: { name, sku, price, stock, category, costPrice, imageUrl, minStock }
         */
        @PostMapping("/onboard/{companyId}/products")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> addProductToCompany(@PathVariable Long companyId,
                        @RequestBody Map<String, Object> body) {
                Company company = companyRepository.findById(companyId)
                                .orElse(null);
                if (company == null) {
                        return ResponseEntity.badRequest().body(new MessageResponse("Empresa no encontrada."));
                }

                String sku = (String) body.get("sku");
                String name = (String) body.get("name");
                String catName = (String) body.getOrDefault("category", "");

                final String catNameTrim = (catName != null) ? catName.trim() : "";

                // 1. Buscar Categoría Global (Solo si existe)
                final Category category = catNameTrim.isEmpty() ? null
                                : categoryRepository.findFirstByNameIgnoreCase(catNameTrim)
                                                .orElse(null);

                // 2. Buscar o Crear en Catálogo Maestro (por SKU)
                CatalogProduct catalogProduct = null;
                if (sku != null && !sku.trim().isEmpty()) {
                        catalogProduct = catalogProductRepository.findBySku(sku.trim())
                                        .orElseGet(() -> {
                                                CatalogProduct cp = new CatalogProduct();
                                                cp.setSku(sku.trim());
                                                cp.setName(name);
                                                cp.setDescription((String) body.getOrDefault("description", ""));
                                                cp.setImageUrl((String) body.getOrDefault("imageUrl", ""));
                                                cp.setCategory(category);
                                                return catalogProductRepository.save(cp);
                                        });
                }

                Product p = new Product();
                p.setName(name);
                p.setSku(sku != null ? sku.trim() : "");
                p.setCategory(catName != null ? catName.trim() : "");
                p.setImageUrl((String) body.getOrDefault("imageUrl", ""));
                p.setPrice(body.get("price") != null ? new BigDecimal(body.get("price").toString()) : BigDecimal.ZERO);
                p.setCostPrice(body.get("costPrice") != null ? new BigDecimal(body.get("costPrice").toString()) : null);
                p.setStock(body.get("stock") != null ? Integer.parseInt(body.get("stock").toString()) : 0);
                p.setMinStock(body.get("minStock") != null ? Integer.parseInt(body.get("minStock").toString()) : 5);
                p.setCompany(company);
                p.setCatalogProduct(catalogProduct); // Vínculo Maestro

                productRepository.save(p);
                return ResponseEntity.ok(p);
        }

        @GetMapping("/categories/global")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getAllGlobalCategories() {
                List<String> names = categoryRepository.findAll().stream()
                                .map(Category::getName)
                                .map(String::trim)
                                .distinct()
                                .collect(java.util.stream.Collectors.toList());
                return ResponseEntity.ok(names);
        }
}
