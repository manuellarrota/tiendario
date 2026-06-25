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
import org.springframework.security.core.context.SecurityContextHolder;
import com.nugar.security.UserDetailsImpl;
import com.nugar.util.BusinessLogger;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

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
        CustomerRepository customerRepository;

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
        com.nugar.service.CashRegisterService cashRegisterService;

        @Autowired
        CategoryRepository categoryRepository;

        @Autowired
        com.nugar.repository.CashRegisterRepository cashRegisterRepository;

        @Autowired
        NotificationRepository notificationRepository;

        @Autowired
        PasswordEncoder passwordEncoder;

        @Autowired
        com.nugar.service.ExchangeRateService exchangeRateService;

        @Autowired
        PurchaseRepository purchaseRepository;

        @Autowired
        InventoryBatchRepository inventoryBatchRepository;

        @Autowired
        AdminAuditLogRepository auditLogRepository;

        // ─── Helper: obtener username del admin autenticado ────────────────────────
        private String getAdminUsername() {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserDetailsImpl u) return u.getUsername();
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails u) return u.getUsername();
            return "admin";
        }

        // ─── Helper: guardar una entrada de auditoría ──────────────────────────────
        private void audit(Long companyId, String entityType, Long entityId,
                           String actionType, String field, String oldVal, String newVal, String reason) {
            AdminAuditLog entry = new AdminAuditLog();
            entry.setAdminUsername(getAdminUsername());
            entry.setCompanyId(companyId);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setActionType(actionType);
            entry.setFieldChanged(field);
            entry.setOldValue(oldVal);
            entry.setNewValue(newVal);
            entry.setReason(reason);
            auditLogRepository.save(entry);
        }

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

        @GetMapping("/companies/{id}/kpis")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyKpis(@PathVariable Long id) {
                Map<String, Object> kpis = new HashMap<>();

                long totalSales = saleRepository.countByCompanyIdAndStatus(id, com.nugar.domain.SaleStatus.PAID);
                java.math.BigDecimal totalRevenue = saleRepository.sumTotalAmountByCompanyIdAndStatus(id, com.nugar.domain.SaleStatus.PAID);
                long totalProducts = productRepository.countByCompanyId(id);
                long totalUsers = userRepository.countByCompanyId(id);
                long totalRegisters = cashRegisterRepository.countByCompanyId(id);

                kpis.put("totalSales", totalSales);
                kpis.put("totalRevenue", totalRevenue != null ? totalRevenue : java.math.BigDecimal.ZERO);
                kpis.put("totalProducts", totalProducts);
                kpis.put("totalUsers", totalUsers);
                kpis.put("totalRegisters", totalRegisters);

                return ResponseEntity.ok(kpis);
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
                company.setPhoneNumber(companyDetails.getPhoneNumber());
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
                        cashRegisterService.provisionRegistersForCompany(company);
                        log.info("[SUSCRIPCION ACTUALIZADA] Estado: {} | Plan: {} | Cajas Extra: {} | Empresa: {} (ID: {})", 
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

        @GetMapping("/payments/{id}")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getPaymentById(@PathVariable Long id) {
                return paymentRepository.findById(id)
                                .map(ResponseEntity::ok)
                                .orElse(ResponseEntity.notFound().build());
        }

        @PostMapping("/payments/{id}/approve")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> approvePayment(@PathVariable Long id) {
                Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                String adminEmail = "admin@nugar.com";
                if (principal instanceof UserDetailsImpl) {
                        adminEmail = ((UserDetailsImpl) principal).getEmail();
                } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                        adminEmail = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
                }
                subscriptionService.approvePayment(id, adminEmail);
                return ResponseEntity.ok(new MessageResponse("Payment approved successfully"));
        }

        @PostMapping("/payments/{id}/reject")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> rejectPayment(@PathVariable Long id, @RequestBody Map<String, String> request) {
                Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                String adminEmail = "admin@nugar.com";
                if (principal instanceof UserDetailsImpl) {
                        adminEmail = ((UserDetailsImpl) principal).getEmail();
                } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                        adminEmail = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
                }
                String reason = request.get("reason");
                subscriptionService.rejectPayment(id, reason, adminEmail);
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

                if (newConfig.getBasicPlanMonthlyPrice() != null) {
                    current.setBasicPlanMonthlyPrice(newConfig.getBasicPlanMonthlyPrice());
                }
                if (newConfig.getMediumPlanMonthlyPrice() != null) {
                    current.setMediumPlanMonthlyPrice(newConfig.getMediumPlanMonthlyPrice());
                }
                if (newConfig.getPremiumPlanMonthlyPrice() != null) {
                    current.setPremiumPlanMonthlyPrice(newConfig.getPremiumPlanMonthlyPrice());
                }
                if (newConfig.getExtraRegisterMonthlyPrice() != null) {
                    current.setExtraRegisterMonthlyPrice(newConfig.getExtraRegisterMonthlyPrice());
                }
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
                
                // Payment Fields
                current.setPaymentZelleEnabled(newConfig.getPaymentZelleEnabled());
                current.setPaymentInfoZelle(newConfig.getPaymentInfoZelle());
                current.setPaymentBinanceEnabled(newConfig.getPaymentBinanceEnabled());
                current.setPaymentInfoBinance(newConfig.getPaymentInfoBinance());
                current.setPaymentPagoMovilEnabled(newConfig.getPaymentPagoMovilEnabled());
                current.setPaymentInfoPagoMovil(newConfig.getPaymentInfoPagoMovil());
                current.setPaymentTransferenciaEnabled(newConfig.getPaymentTransferenciaEnabled());
                current.setPaymentInfoTransferencia(newConfig.getPaymentInfoTransferencia());
                current.setPaymentEfectivoEnabled(newConfig.getPaymentEfectivoEnabled());

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

        @PostMapping("/catalog/sync")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> syncCatalogFromProducts() {
                List<com.nugar.domain.Product> allProducts = productRepository.findAll();
                int created = 0;
                int skipped = 0;
                for (com.nugar.domain.Product p : allProducts) {
                        if (p.getSku() == null || p.getSku().trim().isEmpty()) { skipped++; continue; }
                        String sku = p.getSku().trim();
                        if (catalogProductRepository.findBySku(sku).isPresent()) { skipped++; continue; }
                        com.nugar.domain.CatalogProduct cp = new com.nugar.domain.CatalogProduct();
                        cp.setSku(sku);
                        cp.setName(p.getName());
                        cp.setDescription(p.getDescription());
                        cp.setImageUrl(p.getImageUrl());
                        cp.setBrand(p.getBrand());
                        if (p.getCategory() != null && !p.getCategory().isEmpty()) {
                                categoryRepository.findFirstByNameIgnoreCase(p.getCategory().trim())
                                        .ifPresent(cp::setCategory);
                        }
                        catalogProductRepository.save(cp);
                        created++;
                }
                final int c = created; final int s = skipped;
                BusinessLogger.log(log, "CATALOGO_SINCRONIZADO", data -> {
                        data.put("creados", c);
                        data.put("omitidos", s);
                });
                return ResponseEntity.ok(Map.of("message", "Sincronizacion completada", "creados", created, "omitidos", skipped));
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
                String planStr = (String) body.getOrDefault("subscriptionPlan", "BASIC");
                String statusStr = (String) body.getOrDefault("subscriptionStatus", "TRIAL");
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

                        SubscriptionStatus status;
                        try {
                                status = SubscriptionStatus.valueOf(statusStr);
                        } catch (Exception e) {
                                status = SubscriptionStatus.TRIAL;
                        }
                        company.setSubscriptionStatus(status);
                        
                        if (status == SubscriptionStatus.TRIAL) {
                                int trialDays = configRepository.findFirstByOrderByIdAsc()
                                        .map(com.nugar.domain.GlobalConfig::getTrialDays)
                                        .orElse(30);
                                company.setTrialStartDate(LocalDateTime.now());
                                company.setSubscriptionEndDate(LocalDateTime.now().plusDays(trialDays));
                        }
                        
                        SubscriptionPlan subPlan;
                        try {
                                subPlan = SubscriptionPlan.valueOf(planStr);
                        } catch (Exception e) {
                                subPlan = SubscriptionPlan.BASIC;
                        }
                        company.setSubscriptionPlan(subPlan);
                        
                        companyRepository.save(company);
                        cashRegisterService.provisionRegistersForCompany(company);

                        User user = new User();
                        user.setUsername(username);
                        user.setEmail(email);
                        user.setPassword(passwordEncoder.encode(password));
                        user.getRoles().add(Role.ROLE_MANAGER);
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

        @GetMapping("/notifications")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<Page<Notification>> getGlobalNotifications(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(required = false) String type,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) String readStatus) {
                Pageable pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
                
                String typeParam = (type != null && !type.trim().isEmpty()) ? type : null;
                String searchParam = (search != null && !search.trim().isEmpty()) ? search : null;
                Boolean statusParam = null;
                
                if ("READ".equalsIgnoreCase(readStatus)) {
                        statusParam = true;
                } else if ("UNREAD".equalsIgnoreCase(readStatus)) {
                        statusParam = false;
                }
                
                Page<Notification> result = notificationRepository.searchSuperAdminNotificationsAdvanced(typeParam, searchParam, statusParam, pageable);
                
                return ResponseEntity.ok(result);
        }

        @GetMapping("/notifications/unread-count")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getSuperAdminUnreadCount() {
                try {
                        long total = notificationRepository.countByCompanyIsNullAndReadStatusFalse();
                        java.util.List<Object[]> rawCounts = notificationRepository.countUnreadSuperAdminNotificationsByType();
                        java.util.Map<String, Long> breakdown = new java.util.HashMap<>();
                        for(Object[] row : rawCounts) {
                                String type = row[0] != null ? (String) row[0] : "GENERAL";
                                Long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
                                breakdown.put(type, count);
                        }
                        
                        java.util.Map<String, Object> response = new java.util.HashMap<>();
                        response.put("total", total);
                        response.put("breakdown", breakdown);
                        
                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        return ResponseEntity.status(500).body(new MessageResponse("Error fetching unread count"));
                }
        }

        @PutMapping("/notifications/{id}/read")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> markNotificationAsRead(@PathVariable Long id) {
                Notification notif = notificationRepository.findById(id).orElse(null);
                if (notif != null && notif.getCompany() == null) {
                        notif.setReadStatus(true);
                        notificationRepository.save(notif);
                        return ResponseEntity.ok(new MessageResponse("Notificacion leida."));
                }
                return ResponseEntity.badRequest().body(new MessageResponse("Notificacion no encontrada."));
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Ventas
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/sales")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanySales(
                @PathVariable Long companyId,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "15") int size) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
            Page<Sale> sales = saleRepository.findByCompanyId(companyId, pageable);
            return ResponseEntity.ok(sales);
        }

        /** Editar campos seguros de una venta (typos, método de pago, datos de cliente) */
        @PatchMapping("/companies/{companyId}/sales/{saleId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> patchSale(
                @PathVariable Long companyId,
                @PathVariable Long saleId,
                @RequestBody Map<String, Object> body) {
            Sale sale = saleRepository.findById(saleId).orElse(null);
            if (sale == null || !sale.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            // Campos editables directamente
            boolean recalculateBase = false;
            if (body.containsKey("totalAmount")) {
                String old = sale.getTotalAmount() != null ? sale.getTotalAmount().toPlainString() : "null";
                sale.setTotalAmount(new BigDecimal(body.get("totalAmount").toString()));
                audit(companyId, "SALE", saleId, "EDIT", "totalAmount", old, body.get("totalAmount").toString(), (String) body.get("reason"));
                recalculateBase = true;
            }
            if (body.containsKey("currencyCode")) {
                String old = sale.getPaymentCurrency();
                sale.setPaymentCurrency((String) body.get("currencyCode"));
                audit(companyId, "SALE", saleId, "EDIT", "currencyCode", old, sale.getPaymentCurrency(), (String) body.get("reason"));
                recalculateBase = true;
            }
            if (body.containsKey("exchangeRate")) {
                String old = sale.getExchangeRateUsed() != null ? sale.getExchangeRateUsed().toPlainString() : "null";
                sale.setExchangeRateUsed(new BigDecimal(body.get("exchangeRate").toString()));
                audit(companyId, "SALE", saleId, "EDIT", "exchangeRate", old, sale.getExchangeRateUsed().toString(), (String) body.get("reason"));
                recalculateBase = true;
            }
            
            if (recalculateBase) {
                if ("USD".equalsIgnoreCase(sale.getPaymentCurrency())) {
                    sale.setPaymentAmountInCurrency(sale.getTotalAmount());
                } else if (sale.getExchangeRateUsed() != null && sale.getExchangeRateUsed().compareTo(BigDecimal.ZERO) > 0) {
                    sale.setPaymentAmountInCurrency(sale.getTotalAmount().multiply(sale.getExchangeRateUsed()));
                }
            }

            if (body.containsKey("paymentMethod")) {
                String old = sale.getPaymentMethod() != null ? sale.getPaymentMethod().name() : "null";
                try { sale.setPaymentMethod(PaymentMethod.valueOf((String) body.get("paymentMethod"))); } catch (Exception ignored) {}
                audit(companyId, "SALE", saleId, "EDIT", "paymentMethod", old, (String) body.get("paymentMethod"), (String) body.get("reason"));
            }
            if (body.containsKey("customerName")) {
                String old = sale.getCustomerName();
                sale.setCustomerName((String) body.get("customerName"));
                audit(companyId, "SALE", saleId, "EDIT", "customerName", old, (String) body.get("customerName"), (String) body.get("reason"));
            }
            if (body.containsKey("customerPhone")) {
                String old = sale.getCustomerPhone();
                sale.setCustomerPhone((String) body.get("customerPhone"));
                audit(companyId, "SALE", saleId, "EDIT", "customerPhone", old, (String) body.get("customerPhone"), (String) body.get("reason"));
            }
            if (body.containsKey("customerCedula")) {
                String old = sale.getCustomerCedula();
                sale.setCustomerCedula((String) body.get("customerCedula"));
                audit(companyId, "SALE", saleId, "EDIT", "customerCedula", old, (String) body.get("customerCedula"), (String) body.get("reason"));
            }

            saleRepository.save(sale);
            log.info("[ASISTENCIA] PATCH VENTA #{} empresa #{} por {}", saleId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Venta actualizada correctamente."));
        }

        /** Anular una venta: cambia status a CANCELLED y restaura stock */
        @PostMapping("/companies/{companyId}/sales/{saleId}/void")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> voidSale(
                @PathVariable Long companyId,
                @PathVariable Long saleId,
                @RequestBody Map<String, String> body) {
            String reason = body.get("reason");
            if (reason == null || reason.trim().length() < 10)
                return ResponseEntity.badRequest().body(new MessageResponse("El motivo de anulación debe tener al menos 10 caracteres."));

            Sale sale = saleRepository.findById(saleId).orElse(null);
            if (sale == null || !sale.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();
            if (SaleStatus.CANCELLED.equals(sale.getStatus()))
                return ResponseEntity.badRequest().body(new MessageResponse("Esta venta ya está anulada."));

            // Restaurar stock de cada item
            if (sale.getItems() != null) {
                for (SaleItem item : sale.getItems()) {
                    Product product = item.getProduct();
                    if (product != null && item.getQuantity() != null) {
                        product.setStock(product.getStock() + item.getQuantity());
                        productRepository.save(product);
                        // Restaurar también en el lote FIFO más reciente (orden inverso)
                        List<InventoryBatch> batches = inventoryBatchRepository
                                .findByProductIdAndCurrentQuantityGreaterThanOrderByCreatedAtAsc(product.getId(), -1)
                                .stream()
                                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                                .collect(Collectors.toList());
                        int toRestore = item.getQuantity();
                        for (InventoryBatch batch : batches) {
                            if (toRestore <= 0) break;
                            int space = batch.getInitialQuantity() - batch.getCurrentQuantity();
                            int restore = Math.min(toRestore, space);
                            batch.setCurrentQuantity(batch.getCurrentQuantity() + restore);
                            toRestore -= restore;
                            inventoryBatchRepository.save(batch);
                        }
                    }
                }
            }

            sale.setStatus(SaleStatus.CANCELLED);
            saleRepository.save(sale);
            audit(companyId, "SALE", saleId, "VOID", "ALL", sale.getStatus().name(), "CANCELLED", reason);
            log.warn("[ASISTENCIA] VOID VENTA #{} empresa #{} por {} — Motivo: {}", saleId, companyId, getAdminUsername(), reason);
            return ResponseEntity.ok(new MessageResponse("Venta anulada. Stock restaurado correctamente."));
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Compras
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/purchases")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyPurchases(
                @PathVariable Long companyId,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "15") int size) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
            Page<Purchase> purchases = purchaseRepository.findByCompanyId(companyId, pageable);
            return ResponseEntity.ok(purchases);
        }

        /** Editar campos seguros de una compra (monto, factura, método de pago) */
        @PatchMapping("/companies/{companyId}/purchases/{purchaseId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> patchPurchase(
                @PathVariable Long companyId,
                @PathVariable Long purchaseId,
                @RequestBody Map<String, Object> body) {
            Purchase purchase = purchaseRepository.findById(purchaseId).orElse(null);
            if (purchase == null || !purchase.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            boolean recalculateBase = false;
            if (body.containsKey("total")) {
                String old = purchase.getTotal() != null ? purchase.getTotal().toPlainString() : "null";
                purchase.setTotal(new BigDecimal(body.get("total").toString()));
                audit(companyId, "PURCHASE", purchaseId, "EDIT", "total", old, body.get("total").toString(), (String) body.get("reason"));
                recalculateBase = true;
            }
            if (body.containsKey("currencyCode")) {
                String old = purchase.getCurrencyCode();
                purchase.setCurrencyCode((String) body.get("currencyCode"));
                audit(companyId, "PURCHASE", purchaseId, "EDIT", "currencyCode", old, purchase.getCurrencyCode(), (String) body.get("reason"));
                recalculateBase = true;
            }
            if (body.containsKey("exchangeRate")) {
                String old = purchase.getExchangeRate() != null ? purchase.getExchangeRate().toPlainString() : "null";
                purchase.setExchangeRate(new BigDecimal(body.get("exchangeRate").toString()));
                audit(companyId, "PURCHASE", purchaseId, "EDIT", "exchangeRate", old, purchase.getExchangeRate().toString(), (String) body.get("reason"));
                recalculateBase = true;
            }
            if (recalculateBase) {
                if ("USD".equalsIgnoreCase(purchase.getCurrencyCode())) {
                    purchase.setTotalInBaseCurrency(purchase.getTotal());
                } else if (purchase.getExchangeRate() != null && purchase.getExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                    purchase.setTotalInBaseCurrency(purchase.getTotal().divide(purchase.getExchangeRate(), 4, java.math.RoundingMode.HALF_UP));
                }
            }

            if (body.containsKey("invoiceNumber")) {
                String old = purchase.getInvoiceNumber();
                purchase.setInvoiceNumber((String) body.get("invoiceNumber"));
                audit(companyId, "PURCHASE", purchaseId, "EDIT", "invoiceNumber", old, (String) body.get("invoiceNumber"), (String) body.get("reason"));
            }
            if (body.containsKey("paymentMethod")) {
                String old = purchase.getPaymentMethod() != null ? purchase.getPaymentMethod().name() : "null";
                try { purchase.setPaymentMethod(PaymentMethod.valueOf((String) body.get("paymentMethod"))); } catch (Exception ignored) {}
                audit(companyId, "PURCHASE", purchaseId, "EDIT", "paymentMethod", old, (String) body.get("paymentMethod"), (String) body.get("reason"));
            }

            purchaseRepository.save(purchase);
            log.info("[ASISTENCIA] PATCH COMPRA #{} empresa #{} por {}", purchaseId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Compra actualizada correctamente."));
        }

        /** Anular compra: descuenta del stock lo que esa compra había sumado (bloquea si dejaría stock negativo) */
        @PostMapping("/companies/{companyId}/purchases/{purchaseId}/void")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> voidPurchase(
                @PathVariable Long companyId,
                @PathVariable Long purchaseId,
                @RequestBody Map<String, String> body) {
            String reason = body.get("reason");
            if (reason == null || reason.trim().length() < 10)
                return ResponseEntity.badRequest().body(new MessageResponse("El motivo de anulación debe tener al menos 10 caracteres."));

            Purchase purchase = purchaseRepository.findById(purchaseId).orElse(null);
            if (purchase == null || !purchase.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            // Validar que ningún producto quedará con stock negativo
            if (purchase.getItems() != null) {
                for (PurchaseItem item : purchase.getItems()) {
                    if (item.getProduct() != null && item.getQuantity() != null) {
                        int currentStock = item.getProduct().getStock();
                        if (currentStock < item.getQuantity()) {
                            return ResponseEntity.badRequest().body(new MessageResponse(
                                    "No se puede anular: el producto '" + item.getProduct().getName() +
                                    "' tiene solo " + currentStock + " unidades en stock, pero la compra añadió " +
                                    item.getQuantity() + ". Parte de ese stock ya fue vendido."));
                        }
                    }
                }
            }

            // Descontar stock e invalidar lotes
            if (purchase.getItems() != null) {
                for (PurchaseItem item : purchase.getItems()) {
                    if (item.getProduct() != null && item.getQuantity() != null) {
                        Product product = item.getProduct();
                        product.setStock(product.getStock() - item.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
            // Invalidar los lotes de inventario de esta compra
            List<InventoryBatch> batches = inventoryBatchRepository.findAll().stream()
                    .filter(b -> b.getPurchase() != null && b.getPurchase().getId().equals(purchaseId))
                    .collect(Collectors.toList());
            for (InventoryBatch batch : batches) {
                batch.setCurrentQuantity(0);
                inventoryBatchRepository.save(batch);
            }

            purchase.setStatus(PurchaseStatus.CANCELLED);
            purchaseRepository.save(purchase);

            audit(companyId, "PURCHASE", purchaseId, "VOID", "ALL", "ACTIVE", "VOIDED", reason);
            log.warn("[ASISTENCIA] VOID COMPRA #{} empresa #{} por {} — Motivo: {}", purchaseId, companyId, getAdminUsername(), reason);
            return ResponseEntity.ok(new MessageResponse("Compra anulada. Stock descontado correctamente."));
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Productos
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/products")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyProducts(
                @PathVariable Long companyId,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "20") int size) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
            Page<Product> products = productRepository.findByCompanyId(companyId, pageable);
            return ResponseEntity.ok(products);
        }

        /** Editar nombre, categoría o precio de un producto de la empresa */
        @PatchMapping("/companies/{companyId}/products/{productId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> patchProduct(
                @PathVariable Long companyId,
                @PathVariable Long productId,
                @RequestBody Map<String, Object> body) {
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !product.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            if (body.containsKey("name")) {
                String old = product.getName();
                product.setName((String) body.get("name"));
                audit(companyId, "PRODUCT", productId, "EDIT", "name", old, (String) body.get("name"), (String) body.get("reason"));
            }
            if (body.containsKey("category")) {
                String old = product.getCategory();
                product.setCategory((String) body.get("category"));
                audit(companyId, "PRODUCT", productId, "EDIT", "category", old, (String) body.get("category"), (String) body.get("reason"));
            }
            if (body.containsKey("price")) {
                String old = product.getPrice() != null ? product.getPrice().toPlainString() : "null";
                product.setPrice(new BigDecimal(body.get("price").toString()));
                audit(companyId, "PRODUCT", productId, "EDIT", "price", old, body.get("price").toString(), (String) body.get("reason"));
            }
            if (body.containsKey("description")) {
                String old = product.getDescription();
                product.setDescription((String) body.get("description"));
                audit(companyId, "PRODUCT", productId, "EDIT", "description", old, (String) body.get("description"), (String) body.get("reason"));
            }

            productRepository.save(product);
            log.info("[ASISTENCIA] PATCH PRODUCTO #{} empresa #{} por {}", productId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Producto actualizado correctamente."));
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Usuarios
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/users")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyUsers(@PathVariable Long companyId) {
            List<User> users = userRepository.findByCompanyIdOrderByIdAsc(companyId);
            return ResponseEntity.ok(users);
        }

        @PatchMapping("/companies/{companyId}/users/{userId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> patchCompanyUser(
                @PathVariable Long companyId,
                @PathVariable Long userId,
                @RequestBody Map<String, Object> body) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getCompany() == null || !user.getCompany().getId().equals(companyId)) {
                return ResponseEntity.notFound().build();
            }

            if (body.containsKey("fullName")) {
                String old = user.getFullName();
                user.setFullName((String) body.get("fullName"));
                audit(companyId, "USER", userId, "EDIT", "fullName", old, user.getFullName(), (String) body.get("reason"));
            }
            if (body.containsKey("username")) {
                String old = user.getUsername();
                user.setUsername((String) body.get("username"));
                audit(companyId, "USER", userId, "EDIT", "username", old, user.getUsername(), (String) body.get("reason"));
            }
            if (body.containsKey("email")) {
                String old = user.getEmail();
                user.setEmail((String) body.get("email"));
                audit(companyId, "USER", userId, "EDIT", "email", old, user.getEmail(), (String) body.get("reason"));
            }
            if (body.containsKey("phone")) {
                String old = user.getPhone();
                user.setPhone((String) body.get("phone"));
                audit(companyId, "USER", userId, "EDIT", "phone", old, user.getPhone(), (String) body.get("reason"));
            }
            if (body.containsKey("roles")) {
                String old = user.getRoles().toString();
                List<String> roleStrs = (List<String>) body.get("roles");
                user.getRoles().clear();
                for (String r : roleStrs) {
                    try { user.getRoles().add(Role.valueOf(r.startsWith("ROLE_") ? r : "ROLE_" + r)); } catch (Exception ignored) {}
                }
                audit(companyId, "USER", userId, "EDIT", "roles", old, user.getRoles().toString(), (String) body.get("reason"));
            }

            userRepository.save(user);
            log.info("[ASISTENCIA] PATCH USUARIO #{} empresa #{} por {}", userId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Usuario actualizado correctamente."));
        }

        @PostMapping("/companies/{companyId}/users/{userId}/reset-password")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> resetCompanyUserPassword(
                @PathVariable Long companyId,
                @PathVariable Long userId,
                @RequestBody Map<String, String> body) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getCompany() == null || !user.getCompany().getId().equals(companyId)) {
                return ResponseEntity.notFound().build();
            }
            
            String newPassword = body.get("newPassword");
            String reason = body.get("reason");
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(new MessageResponse("La nueva contraseña debe tener al menos 6 caracteres."));
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            audit(companyId, "USER", userId, "RESET_PASSWORD", "password", "***", "***", reason);
            log.warn("[ASISTENCIA] RESET PASSWORD USUARIO #{} empresa #{} por {}", userId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Contraseña reseteada correctamente."));
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Historial de Cambios
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/audit-log")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyAuditLog(
                @PathVariable Long companyId,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "20") int size) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<AdminAuditLog> log2 = auditLogRepository.findByCompanyIdOrderByTimestampDesc(companyId, pageable);
            return ResponseEntity.ok(log2);
        }

        // ══════════════════════════════════════════════════════════════════════════
        //  MÓDULO ASISTENCIA TÉCNICA — Clientes
        // ══════════════════════════════════════════════════════════════════════════

        @GetMapping("/companies/{companyId}/customers")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<?> getCompanyCustomers(
                @PathVariable Long companyId,
                @RequestParam(defaultValue = "0") int page,
                @RequestParam(defaultValue = "15") int size) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
            Page<Customer> customers = customerRepository.findByCompanyId(companyId, pageable);
            return ResponseEntity.ok(customers);
        }

        @PatchMapping("/companies/{companyId}/customers/{customerId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> patchCustomer(
                @PathVariable Long companyId,
                @PathVariable Long customerId,
                @RequestBody Map<String, Object> body) {
            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || !customer.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            if (body.containsKey("name")) {
                String old = customer.getName();
                customer.setName((String) body.get("name"));
                audit(companyId, "CUSTOMER", customerId, "EDIT", "name", old, customer.getName(), (String) body.get("reason"));
            }
            if (body.containsKey("email")) {
                String old = customer.getEmail();
                customer.setEmail((String) body.get("email"));
                audit(companyId, "CUSTOMER", customerId, "EDIT", "email", old, customer.getEmail(), (String) body.get("reason"));
            }
            if (body.containsKey("phone")) {
                String old = customer.getPhone();
                customer.setPhone((String) body.get("phone"));
                audit(companyId, "CUSTOMER", customerId, "EDIT", "phone", old, customer.getPhone(), (String) body.get("reason"));
            }
            if (body.containsKey("cedula")) {
                String old = customer.getCedula();
                customer.setCedula((String) body.get("cedula"));
                audit(companyId, "CUSTOMER", customerId, "EDIT", "cedula", old, customer.getCedula(), (String) body.get("reason"));
            }
            if (body.containsKey("address")) {
                String old = customer.getAddress();
                customer.setAddress((String) body.get("address"));
                audit(companyId, "CUSTOMER", customerId, "EDIT", "address", old, customer.getAddress(), (String) body.get("reason"));
            }
            if (body.containsKey("loyaltyPoints")) {
                String old = customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints().toString() : "0";
                try {
                    customer.setLoyaltyPoints(Integer.parseInt(body.get("loyaltyPoints").toString()));
                } catch (NumberFormatException ignored) {}
                audit(companyId, "CUSTOMER", customerId, "EDIT", "loyaltyPoints", old, String.valueOf(customer.getLoyaltyPoints()), (String) body.get("reason"));
            }

            customerRepository.save(customer);
            log.info("[ASISTENCIA] PATCH CLIENTE #{} empresa #{} por {}", customerId, companyId, getAdminUsername());
            return ResponseEntity.ok(new MessageResponse("Cliente actualizado correctamente."));
        }

        @DeleteMapping("/companies/{companyId}/customers/{customerId}")
        @PreAuthorize("hasRole('ADMIN')")
        @Transactional
        public ResponseEntity<?> deleteCustomer(
                @PathVariable Long companyId,
                @PathVariable Long customerId,
                @RequestBody Map<String, String> body) {
            String reason = body.get("reason");
            if (reason == null || reason.trim().length() < 10)
                return ResponseEntity.badRequest().body(new MessageResponse("El motivo de eliminación debe tener al menos 10 caracteres."));

            Customer customer = customerRepository.findById(customerId).orElse(null);
            if (customer == null || !customer.getCompany().getId().equals(companyId))
                return ResponseEntity.notFound().build();

            // Validate if customer has sales
            if (saleRepository.existsByCustomerId(customerId)) {
                return ResponseEntity.badRequest().body(new MessageResponse("No se puede eliminar el cliente porque tiene ventas asociadas."));
            }

            customerRepository.delete(customer);
            audit(companyId, "CUSTOMER", customerId, "DELETE", "ALL", customer.getName(), "DELETED", reason);
            log.warn("[ASISTENCIA] DELETE CLIENTE #{} empresa #{} por {} — Motivo: {}", customerId, companyId, getAdminUsername(), reason);
            return ResponseEntity.ok(new MessageResponse("Cliente eliminado exitosamente."));
        }
}
