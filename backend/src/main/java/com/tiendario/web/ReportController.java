package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping("/top-products")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getTopProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long companyId = userDetails.getCompanyId();

        Pageable pageable = PageRequest.of(page, size);
        Page<Object[]> performance = saleRepository.findTopSellingProductsByCompany(companyId, pageable);

        Page<Map<String, Object>> result = performance.map(data -> {
            Map<String, Object> map = new HashMap<>();
            map.put("name", data[0]);
            map.put("totalSold", data[1]);
            map.put("totalRevenue", data[2]);
            return map;
        });

        return ResponseEntity.ok(result);
    }

    @GetMapping("/inventory-stats")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getInventoryStats() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long companyId = userDetails.getCompanyId();

        List<Product> products = productRepository.findByCompanyId(companyId);
        
        BigDecimal totalInventoryValue = BigDecimal.ZERO;
        BigDecimal totalCostValue = BigDecimal.ZERO;
        long totalItems = 0;

        for (Product p : products) {
            BigDecimal stock = new BigDecimal(p.getStock());
            if (p.getPrice() != null) {
                totalInventoryValue = totalInventoryValue.add(p.getPrice().multiply(stock));
            }
            if (p.getCostPrice() != null) {
                totalCostValue = totalCostValue.add(p.getCostPrice().multiply(stock));
            }
            totalItems += p.getStock();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalValue", totalInventoryValue);
        stats.put("totalCost", totalCostValue);
        stats.put("potentialProfit", totalInventoryValue.subtract(totalCostValue));
        stats.put("totalItems", totalItems);
        stats.put("distinctProducts", products.size());

        return ResponseEntity.ok(stats);
    }
}
