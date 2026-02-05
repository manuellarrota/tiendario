package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.domain.Sale;
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

    @GetMapping("/summary")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getDashboardSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Long companyId = userDetails.getCompanyId();

        Map<String, Object> summary = new HashMap<>();

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
            if (p.getPrice() != null && p.getCostPrice() != null && p.getPrice().compareTo(BigDecimal.ZERO) > 0) {
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
                saleRepository.countByCompanyIdAndStatus(companyId, com.tiendario.domain.SaleStatus.PENDING));
        summary.put("processingOrders",
                saleRepository.countByCompanyIdAndStatus(companyId, com.tiendario.domain.SaleStatus.PAID));
        summary.put("completedOrders",
                saleRepository.countByCompanyIdAndStatus(companyId, com.tiendario.domain.SaleStatus.DELIVERED));
        summary.put("cancelledOrders",
                saleRepository.countByCompanyIdAndStatus(companyId, com.tiendario.domain.SaleStatus.CANCELLED));

        return ResponseEntity.ok(summary);
    }
}
