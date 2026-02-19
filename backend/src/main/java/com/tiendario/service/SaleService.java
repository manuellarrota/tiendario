package com.tiendario.service;

import com.tiendario.domain.*;
import com.tiendario.payload.response.DailySalesSummary;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Autowired
    public SaleService(SaleRepository saleRepository,
            ProductRepository productRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    public List<Sale> getCompanySales(UserDetailsImpl userDetails) {
        return saleRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    @Transactional
    public void createSale(Sale sale, UserDetailsImpl userDetails) {
        if (userDetails.getCompanyId() == null) {
            throw new RuntimeException("Error: User has no company assigned.");
        }

        var company = companyRepository.findById(userDetails.getCompanyId()).orElse(null);
        if (company == null) {
            throw new RuntimeException("Error: Company not found.");
        }

        // Block sales for accounts without active subscription
        SubscriptionStatus subStatus = company.getSubscriptionStatus();
        if (SubscriptionStatus.FREE.equals(subStatus)) {
            throw new RuntimeException(
                    "El plan GRATUITO no permite registrar ventas. Mejora a PREMIUM para acceder al sistema de ventas.");
        }
        if (SubscriptionStatus.PAST_DUE.equals(subStatus)) {
            throw new RuntimeException("Tu suscripción ha vencido. Renueva tu plan para poder registrar ventas.");
        }
        if (SubscriptionStatus.SUSPENDED.equals(subStatus)) {
            throw new RuntimeException("Tu cuenta está suspendida. Contacta al administrador para reactivarla.");
        }

        sale.setCompany(company);
        sale.setDate(LocalDateTime.now());

        // Default to PENDING if not specified (Marketplace orders)
        if (sale.getStatus() == null) {
            sale.setStatus(com.tiendario.domain.SaleStatus.PENDING);
        }

        // Set User (Cashier)
        com.tiendario.domain.User cashier = userRepository.findById(userDetails.getId()).orElse(null);
        sale.setUser(cashier);

        // Payment Method can be null for PENDING orders
        if (com.tiendario.domain.SaleStatus.PAID.equals(sale.getStatus()) && sale.getPaymentMethod() == null) {
            sale.setPaymentMethod(com.tiendario.domain.PaymentMethod.CASH);
        }

        if (sale.getItems() == null || sale.getItems().isEmpty()) {
            throw new RuntimeException("Error: Sale must have at least one item.");
        }

        for (SaleItem item : sale.getItems()) {
            item.setSale(sale);

            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new RuntimeException("Error: Each item must have a product ID.");
            }

            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Check stock and availability (reserve it even if pending)
            if (product.getStock() < item.getQuantity()) {
                throw new RuntimeException("Error: Insufficient stock for " + product.getName());
            }

            // Update Stock
            product.setStock(product.getStock() - item.getQuantity());
            productRepository.save(product);

            item.setProduct(product);
        }

        saleRepository.save(sale);
    }

    @Transactional
    public void updateSaleStatus(Long id, com.tiendario.domain.SaleStatus status,
            com.tiendario.domain.PaymentMethod paymentMethod, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(id).orElse(null);
        if (sale == null || !sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Error: Sale not found or access denied.");
        }

        sale.setStatus(status);

        // If updating to PAID, set the payment method if provided
        if (com.tiendario.domain.SaleStatus.PAID.equals(status) && paymentMethod != null) {
            sale.setPaymentMethod(paymentMethod);
        }

        saleRepository.save(sale);
    }

    public List<DailySalesSummary> getDailySalesSummaryList(UserDetailsImpl userDetails) {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(999999999);

        List<Sale> sales = saleRepository.findByCompanyIdAndDateBetween(
                userDetails.getCompanyId(), startOfDay, endOfDay);

        // Group by User and PaymentMethod
        Map<String, Map<PaymentMethod, List<Sale>>> grouped = sales.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getUser() != null ? s.getUser().getUsername() : "Unknown",
                        Collectors.groupingBy(sale -> sale.getPaymentMethod() != null ? sale.getPaymentMethod()
                                : PaymentMethod.CASH)));

        List<DailySalesSummary> summary = new ArrayList<>();

        grouped.forEach((username, methodMap) -> {
            methodMap.forEach((method, userSales) -> {
                long count = userSales.size();
                java.math.BigDecimal total = userSales.stream()
                        .map(Sale::getTotalAmount)
                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                summary.add(new DailySalesSummary(username, method, count, total));
            });
        });

        return summary;
    }
}
