package com.tiendario.service;

import com.tiendario.domain.*;
import com.tiendario.payload.response.DailySalesSummary;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.repository.ShiftRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private final ShiftRepository shiftRepository;

    @Autowired
    public SaleService(SaleRepository saleRepository,
            ProductRepository productRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            EmailService emailService,
            ShiftRepository shiftRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.shiftRepository = shiftRepository;
    }

    public List<Sale> getCompanySales(UserDetailsImpl userDetails) {
        return saleRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    public Page<Sale> getCompanySalesPaginated(UserDetailsImpl userDetails, SaleStatus status, Pageable pageable) {
        if (status != null) {
            return saleRepository.findByCompanyIdAndStatus(userDetails.getCompanyId(), status, pageable);
        }
        return saleRepository.findByCompanyId(userDetails.getCompanyId(), pageable);
    }

    public Sale getSaleById(Long id, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(id).orElse(null);
        if (sale == null || !sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Error: Sale not found or access denied.");
        }
        return sale;
    }

    @Transactional
    public void createSale(Sale sale, UserDetailsImpl userDetails) {
        if (userDetails.getCompanyId() == null) {
            throw new RuntimeException("Error: El usuario no tiene una empresa asignada.");
        }

        var company = companyRepository.findById(userDetails.getCompanyId()).orElse(null);
        if (company == null) {
            throw new RuntimeException("Error: Empresa no encontrada.");
        }

        // Block sales for accounts without active subscription
        SubscriptionStatus subStatus = company.getSubscriptionStatus();
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

        // Link to active shift
        shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                .ifPresent(sale::setShift);

        // Payment Method can be null for PENDING orders
        if (com.tiendario.domain.SaleStatus.PAID.equals(sale.getStatus()) && sale.getPaymentMethod() == null) {
            sale.setPaymentMethod(com.tiendario.domain.PaymentMethod.CASH);
        }

        if (sale.getItems() == null || sale.getItems().isEmpty()) {
            throw new RuntimeException("Error: La venta debe tener al menos un artículo.");
        }

        java.math.BigDecimal computedTotal = java.math.BigDecimal.ZERO;

        for (SaleItem item : sale.getItems()) {
            item.setSale(sale);

            if (item.getProduct() == null || item.getProduct().getId() == null) {
                throw new RuntimeException("Error: Cada artículo debe tener un ID de producto.");
            }

            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new RuntimeException("Error: Cantidad inválida, debe ser mayor a cero.");
            }

            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Check stock and availability (reserve it even if pending)
            if (product.getStock() < item.getQuantity()) {
                throw new RuntimeException("Error: Stock insuficiente para " + product.getName());
            }

            // Update Stock
            product.setStock(product.getStock() - item.getQuantity());
            productRepository.save(product);

            // Force server-side calculation of pricing (Zero-Trust to frontend)
            item.setProduct(product);
            item.setUnitPrice(product.getPrice());
            java.math.BigDecimal subtotal = product.getPrice().multiply(new java.math.BigDecimal(item.getQuantity()));
            item.setSubtotal(subtotal);

            computedTotal = computedTotal.add(subtotal);
        }

        // Ignore whatever the frontend said the total was
        sale.setTotalAmount(computedTotal);

        // Handle payments
        if (sale.getPayments() != null && !sale.getPayments().isEmpty()) {
            for (SalePayment payment : sale.getPayments()) {
                payment.setSale(sale);
                // Ensure amountInBaseCurrency is calculated if not provided
                if (payment.getAmountInBaseCurrency() == null && payment.getExchangeRate() != null && payment.getExchangeRate().compareTo(java.math.BigDecimal.ZERO) > 0) {
                     payment.setAmountInBaseCurrency(payment.getAmount().divide(payment.getExchangeRate(), 2, java.math.RoundingMode.HALF_UP));
                }
            }
        }

        saleRepository.save(sale);

        log.info("[VENTA] Usuario: {} | Empresa: {} | ID: {} | Monto: {} | Estado: {} | Cliente: {}", 
            cashier != null ? cashier.getUsername() : "Desconocido",
            company.getName(),
            sale.getId(),
            sale.getTotalAmount(),
            sale.getStatus(),
            sale.getCustomerName() != null ? sale.getCustomerName() : "General");

        // Notify store owner about new marketplace order (PENDING orders only)
        if (SaleStatus.PENDING.equals(sale.getStatus())) {
            try {
                // Find the store manager's email
                List<User> managers = userRepository.findByCompanyIdAndRole(
                        company.getId(), Role.ROLE_MANAGER);
                if (!managers.isEmpty()) {
                    String orderSummary = sale.getItems().stream()
                            .map(i -> i.getQuantity() + "x " + i.getProduct().getName())
                            .collect(Collectors.joining("\n"));
                    double total = sale.getItems().stream()
                            .mapToDouble(i -> i.getQuantity() * i.getProduct().getPrice().doubleValue())
                            .sum();
                    String customerName = sale.getCustomerName() != null ? sale.getCustomerName() : "Cliente";
                    for (User mgr : managers) {
                        if (mgr.getEmail() != null) {
                            emailService.sendNewOrderNotification(
                                    mgr.getEmail(), company.getName(), customerName, orderSummary, total);
                        }
                    }
                }
            } catch (Exception e) {
                // Don't let notification failures block order creation
                org.slf4j.LoggerFactory.getLogger(SaleService.class)
                        .warn("Could not send new order notification: {}", e.getMessage());
            }
        }
    }

    @Transactional
    public void updateSaleStatus(Long id, com.tiendario.domain.SaleStatus status,
            com.tiendario.domain.PaymentMethod paymentMethod, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(id).orElse(null);
        if (sale == null || !sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Error: Sale not found or access denied.");
        }

        // Restore stock if cancelling an order that had reserved stock
        if (com.tiendario.domain.SaleStatus.CANCELLED.equals(status)
                && !com.tiendario.domain.SaleStatus.CANCELLED.equals(sale.getStatus())) {
            if (sale.getItems() != null) {
                for (SaleItem item : sale.getItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        product.setStock(product.getStock() + item.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
        }

        sale.setStatus(status);

        // If updating to PAID, set the payment method if provided
        if (com.tiendario.domain.SaleStatus.PAID.equals(status)) {
            if (paymentMethod != null) {
                sale.setPaymentMethod(paymentMethod);
            }
            // Also link to current shift if it was a pending order from before
            if (sale.getShift() == null) {
                shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                        .ifPresent(sale::setShift);
            }
        }

        saleRepository.save(sale);

        log.info("[VENTA_ESTADO] Usuario: {} | Empresa: {} | ID Venta: {} | Nuevo Estado: {}", 
            userDetails.getUsername(),
            sale.getCompany().getName(),
            sale.getId(),
            status);

        // Notify customer about status change (if email available)
        try {
            String customerEmail = sale.getCustomerEmail();
            if (customerEmail != null && !customerEmail.isBlank()) {
                emailService.sendOrderStatusUpdateEmail(
                        customerEmail,
                        sale.getCustomerName() != null ? sale.getCustomerName() : "Cliente",
                        sale.getCompany().getName(),
                        status.name(),
                        String.valueOf(sale.getId()));
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(SaleService.class)
                    .warn("Could not send order status update notification: {}", e.getMessage());
        }
    }

    public List<DailySalesSummary> getDailySalesSummaryList(UserDetailsImpl userDetails) {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59).withNano(999999999);

        List<Sale> sales = saleRepository.findByCompanyIdAndDateBetween(
                userDetails.getCompanyId(), startOfDay, endOfDay);

        // Only count completed (PAID) sales
        List<Sale> paidSales = sales.stream()
                .filter(s -> SaleStatus.PAID.equals(s.getStatus()))
                .collect(Collectors.toList());

        // We need to aggregate by User and payment method across ALL payments of ALL sales
        Map<String, Map<PaymentMethod, java.math.BigDecimal>> aggregates = new java.util.HashMap<>();
        Map<String, Map<PaymentMethod, Long>> counts = new java.util.HashMap<>();

        for (Sale s : paidSales) {
            String username = s.getUser() != null ? s.getUser().getUsername() : "Unknown";
            
            if (s.getPayments() == null || s.getPayments().isEmpty()) {
                // Fallback for legacy sales or sales without explicit payment list
                PaymentMethod method = s.getPaymentMethod() != null ? s.getPaymentMethod() : PaymentMethod.CASH;
                updateAggregates(aggregates, counts, username, method, s.getTotalAmount());
            } else {
                for (SalePayment p : s.getPayments()) {
                    PaymentMethod method = p.getMethod() != null ? p.getMethod() : PaymentMethod.CASH;
                    // We use amountInBaseCurrency for the total report
                    java.math.BigDecimal amount = p.getAmountInBaseCurrency() != null ? p.getAmountInBaseCurrency() : p.getAmount();
                    updateAggregates(aggregates, counts, username, method, amount);
                }
            }
        }

        List<DailySalesSummary> summary = new ArrayList<>();
        aggregates.forEach((username, methodMap) -> {
            methodMap.forEach((method, total) -> {
                Long count = counts.get(username).get(method);
                summary.add(new DailySalesSummary(username, method, count, total));
            });
        });

        return summary;
    }

    private void updateAggregates(Map<String, Map<PaymentMethod, java.math.BigDecimal>> aggregates, 
                                Map<String, Map<PaymentMethod, Long>> counts,
                                String username, PaymentMethod method, java.math.BigDecimal amount) {
        aggregates.computeIfAbsent(username, k -> new java.util.HashMap<>())
                  .merge(method, amount, java.math.BigDecimal::add);
        counts.computeIfAbsent(username, k -> new java.util.HashMap<>())
              .merge(method, 1L, Long::sum);
    }
}
