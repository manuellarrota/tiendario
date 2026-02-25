package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.domain.Sale;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

        @Autowired
        ProductRepository productRepository;

        @Autowired
        SaleRepository saleRepository;

        @Autowired
        CompanyRepository companyRepository;

        @GetMapping("/summary")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> getDashboardSummary() {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();
                Long companyId = userDetails.getCompanyId();

                Map<String, Object> summary = new HashMap<>();

                // 0. Company Info for Subscription Tracking
                com.tiendario.domain.Company company = companyRepository.findById(companyId).orElse(null);
                if (company != null) {
                        summary.put("subscriptionStatus", company.getSubscriptionStatus());
                        summary.put("subscriptionEndDate", company.getSubscriptionEndDate());
                }

                // 1. Total Products
                summary.put("totalProducts", productRepository.countByCompanyId(companyId));

                // 2. Low Stock Count
                summary.put("lowStockCount", productRepository.countLowStockByCompanyId(companyId));

                // 3. Sales Today
                LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
                List<Sale> salesToday = saleRepository.findByCompanyIdAndDateAfter(companyId, startOfDay);

                BigDecimal revenueToday = salesToday.stream()
                                .map(Sale::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                summary.put("revenueToday", revenueToday);
                summary.put("salesCountToday", salesToday.size());

                // 4. Margin (Simplified: based on all products with costPrice)
                List<Product> products = productRepository.findByCompanyId(companyId);
                BigDecimal totalProfitPotential = BigDecimal.ZERO;
                BigDecimal totalRevenuePotential = BigDecimal.ZERO;

                for (Product p : products) {
                        if (p.getPrice() != null && p.getCostPrice() != null
                                        && p.getPrice().compareTo(BigDecimal.ZERO) > 0) {
                                BigDecimal profit = p.getPrice().subtract(p.getCostPrice());
                                totalProfitPotential = totalProfitPotential.add(profit);
                                totalRevenuePotential = totalRevenuePotential.add(p.getPrice());
                        }
                }

                BigDecimal margin = BigDecimal.ZERO;
                if (totalRevenuePotential.compareTo(BigDecimal.ZERO) > 0) {
                        margin = totalProfitPotential.divide(totalRevenuePotential, 4, RoundingMode.HALF_UP)
                                        .multiply(new BigDecimal(100));
                }
                summary.put("averageMargin", margin.setScale(2, RoundingMode.HALF_UP));

                // 5. Orders Breakdown
                summary.put("pendingOrders",
                                saleRepository.countByCompanyIdAndStatus(companyId,
                                                com.tiendario.domain.SaleStatus.PENDING));
                summary.put("preparingOrders",
                                saleRepository.countByCompanyIdAndStatus(companyId,
                                                com.tiendario.domain.SaleStatus.PREPARING));
                summary.put("readyOrders",
                                saleRepository.countByCompanyIdAndStatus(companyId,
                                                com.tiendario.domain.SaleStatus.READY_FOR_PICKUP));
                summary.put("completedOrders",
                                saleRepository.countByCompanyIdAndStatus(companyId,
                                                com.tiendario.domain.SaleStatus.PAID));
                summary.put("cancelledOrders",
                                saleRepository.countByCompanyIdAndStatus(companyId,
                                                com.tiendario.domain.SaleStatus.CANCELLED));

                // 6. Shop AOV (Average Order Value)
                List<Sale> allSales = saleRepository.findByCompanyIdOrderByDateDesc(companyId);
                long totalSalesCount = allSales.size();
                BigDecimal totalRevenue = allSales.stream()
                                .map(Sale::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal shopAov = totalSalesCount > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(totalSalesCount), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;
                summary.put("shopAov", shopAov);
                summary.put("totalOrdersCount", totalSalesCount);

                // 7. Sales comparison (Today vs Yesterday)
                LocalDateTime startOfYesterday = LocalDate.now().minusDays(1).atStartOfDay();
                LocalDateTime endOfYesterday = LocalDateTime.of(LocalDate.now().minusDays(1), java.time.LocalTime.MAX);
                List<Sale> salesYesterday = saleRepository.findByCompanyIdAndDateBetween(companyId, startOfYesterday,
                                endOfYesterday);

                BigDecimal revenueYesterday = salesYesterday.stream()
                                .map(Sale::getTotalAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                summary.put("revenueYesterday", revenueYesterday);

                BigDecimal growth = BigDecimal.ZERO;
                if (revenueYesterday.compareTo(BigDecimal.ZERO) > 0) {
                        growth = revenueToday.subtract(revenueYesterday)
                                        .divide(revenueYesterday, 4, RoundingMode.HALF_UP)
                                        .multiply(new BigDecimal(100));
                } else if (revenueToday.compareTo(BigDecimal.ZERO) > 0) {
                        growth = new BigDecimal(100); // 100% growth if yesterday was 0
                }
                summary.put("revenueGrowth", growth.setScale(1, RoundingMode.HALF_UP));

                // 8. Payment Methods Breakdown
                Map<String, Long> payments = new HashMap<>();
                for (Sale s : allSales) {
                        String method = s.getPaymentMethod() != null ? s.getPaymentMethod().toString() : "PENDING";
                        payments.put(method, payments.getOrDefault(method, 0L) + 1);
                }
                summary.put("paymentMethods", payments);

                // 9. Top Selling Product (All time for now)
                List<Object[]> topProducts = saleRepository.findTopSellingProductsByCompany(companyId,
                                org.springframework.data.domain.PageRequest.of(0, 1));
                if (!topProducts.isEmpty()) {
                        Object[] top = topProducts.get(0);
                        summary.put("topProductName", top[0]);
                        summary.put("topProductQty", top[1]);
                }

                return ResponseEntity.ok(summary);
        }
}
