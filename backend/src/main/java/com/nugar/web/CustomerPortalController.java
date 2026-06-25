package com.nugar.web;

import com.nugar.domain.Sale;
import com.nugar.repository.SaleRepository;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer-portal")
public class CustomerPortalController {

    @Autowired
    SaleRepository saleRepository;

    @Autowired
    com.nugar.service.SaleService saleService;

    @GetMapping("/orders")
    @PreAuthorize("isAuthenticated()")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getMyOrders() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        String searchEmail = userDetails.getEmail() != null ? userDetails.getEmail() : userDetails.getUsername();
        List<Sale> sales = saleRepository.findByCustomerEmailOrUserId(searchEmail, userDetails.getId());
        
        System.out.println("====== DEBUG CUSTOMER ORDERS ======");
        System.out.println("User searching for email: " + searchEmail);
        System.out.println("Sales found by query: " + sales.size());
        
        List<Sale> allSales = saleRepository.findAll();
        System.out.println("Total sales in database: " + allSales.size());
        for (Sale s : allSales) {
            System.out.println("Sale ID: " + s.getId() + " | CustomerEmail: '" + s.getCustomerEmail() + "' | Date: " + s.getDate());
        }
        System.out.println("===================================");

        List<Map<String, Object>> result = sales.stream().map(sale -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", sale.getId());
            map.put("date", sale.getDate());
            map.put("totalAmount", sale.getTotalAmount());
            map.put("status", sale.getStatus());
            map.put("paymentMethod", sale.getPaymentMethod() != null ? sale.getPaymentMethod().name() : null);
            map.put("paymentCurrency", sale.getPaymentCurrency());
            map.put("paymentAmountInCurrency", sale.getPaymentAmountInCurrency());
            map.put("exchangeRateUsed", sale.getExchangeRateUsed());

            // Company
            Map<String, Object> companyMap = new HashMap<>();
            if (sale.getCompany() != null) {
                companyMap.put("id", sale.getCompany().getId());
                companyMap.put("name", sale.getCompany().getName());
            }
            map.put("company", companyMap);

            // Items
            List<Map<String, Object>> itemsList = sale.getItems().stream().map(item -> {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("subtotal", item.getSubtotal());
                if (item.getProduct() != null) {
                    Map<String, Object> productMap = new HashMap<>();
                    productMap.put("name", item.getProduct().getName());
                    productMap.put("price", item.getProduct().getPrice());
                    itemMap.put("id", item.getProduct().getId());
                    itemMap.put("sku", item.getProduct().getSku());
                    itemMap.put("imageUrl", item.getProduct().getImageUrl());
                    itemMap.put("displayName", item.getProduct().getDisplayName()); // Use helper
                    // itemMap.put("productStatus",
                    // item.getProduct().getCompany().getSubscriptionStatus());

                    itemMap.put("product", productMap);
                }
                return itemMap;
            }).collect(Collectors.toList());

            map.put("items", itemsList);

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/orders/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        try {
            saleService.cancelOrderAsCustomer(id, userDetails);
            return ResponseEntity.ok(Map.of("message", "Pedido cancelado con éxito"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/dashboard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getDashboardStats() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        String searchEmail = userDetails.getEmail() != null ? userDetails.getEmail() : userDetails.getUsername();
        List<Sale> sales = saleRepository.findByCustomerEmailOrUserId(searchEmail, userDetails.getId());

        BigDecimal totalSpent = sales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalOrders", sales.size());
        stats.put("totalSpent", totalSpent);
        stats.put("lastOrderDate", sales.isEmpty() ? null : sales.get(0).getDate());

        return ResponseEntity.ok(stats);
    }
}
