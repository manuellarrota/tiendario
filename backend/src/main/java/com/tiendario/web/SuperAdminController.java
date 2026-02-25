package com.tiendario.web;

import com.tiendario.domain.Company;
import com.tiendario.domain.Sale;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.domain.User;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.repository.GlobalConfigRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.repository.CatalogProductRepository;
import com.tiendario.domain.CatalogProduct;
import com.tiendario.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
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
        GlobalConfigRepository configRepository;

        @Autowired
        CatalogProductRepository catalogProductRepository;

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
                // Also update all local products pointing to this catalog product for
                // consistency in search
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
}
