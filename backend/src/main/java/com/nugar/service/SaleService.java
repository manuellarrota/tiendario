package com.nugar.service;

import com.nugar.domain.*;
import com.nugar.payload.response.DailySalesSummary;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.ProductRepository;
import com.nugar.repository.SaleRepository;
import com.nugar.repository.UserRepository;
import com.nugar.repository.ShiftRepository;
import com.nugar.repository.InventoryBatchRepository;
import com.nugar.security.UserDetailsImpl;
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

import com.nugar.util.BusinessLogger;
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
    private final InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    public SaleService(SaleRepository saleRepository,
            ProductRepository productRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            EmailService emailService,
            ShiftRepository shiftRepository,
            InventoryBatchRepository inventoryBatchRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.shiftRepository = shiftRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
    }

    public List<Sale> getCompanySales(UserDetailsImpl userDetails) {
        return saleRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    public Page<Sale> getCompanySalesPaginated(UserDetailsImpl userDetails, SaleStatus status, Pageable pageable) {
        boolean isCashier = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CASHIER"));
        boolean isManager = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")) || 
                            userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isCashier && !isManager) {
            if (status != null) {
                return saleRepository.findByCompanyIdAndUserIdAndStatus(userDetails.getCompanyId(), userDetails.getId(), status, pageable);
            }
            return saleRepository.findByCompanyIdAndUserId(userDetails.getCompanyId(), userDetails.getId(), pageable);
        }

        if (status != null) {
            return saleRepository.findByCompanyIdAndStatus(userDetails.getCompanyId(), status, pageable);
        }
        return saleRepository.findByCompanyId(userDetails.getCompanyId(), pageable);
    }

    public Page<Sale> getFilteredSales(
            UserDetailsImpl userDetails,
            Long cashRegisterId,
            String customerName,
            LocalDateTime dateFrom,
            LocalDateTime dateTo,
            PaymentMethod paymentMethod,
            SaleStatus status,
            Pageable pageable) {
        
        boolean isCashier = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CASHIER"));
        boolean isManagerOrAdmin = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")) || 
                                   userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        Long filterUserId = null;
        if (isCashier && !isManagerOrAdmin) {
            filterUserId = userDetails.getId();
        }

        return saleRepository.findByFilters(
                userDetails.getCompanyId(),
                filterUserId,
                cashRegisterId,
                customerName,
                dateFrom,
                dateTo,
                paymentMethod,
                status,
                pageable
        );
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
            sale.setStatus(com.nugar.domain.SaleStatus.PENDING);
        }

        // Set User (Cashier)
        com.nugar.domain.User cashier = userRepository.findById(userDetails.getId()).orElse(null);
        sale.setUser(cashier);

        // Link to active shift and cash register
        shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN)
                .ifPresent(shift -> {
                    sale.setShift(shift);
                    if (shift.getCashRegister() != null) {
                        sale.setCashRegister(shift.getCashRegister());
                    }
                });

        // Derive the primary payment method from the payments list
        if (com.nugar.domain.SaleStatus.PAID.equals(sale.getStatus())) {
            if (sale.getPayments() != null && !sale.getPayments().isEmpty()) {
                long distinctMethods = sale.getPayments().stream()
                        .filter(p -> p.getMethod() != null
                                && p.getAmountInBaseCurrency() != null
                                && p.getAmountInBaseCurrency().compareTo(java.math.BigDecimal.ZERO) > 0)
                        .map(p -> p.getMethod())
                        .distinct()
                        .count();

                if (distinctMethods > 1) {
                    // Multiple payment methods used → MIXED
                    sale.setPaymentMethod(com.nugar.domain.PaymentMethod.MIXED);
                } else {
                    // Single method: pick it directly
                    com.nugar.domain.PaymentMethod dominant = sale.getPayments().stream()
                            .filter(p -> p.getMethod() != null
                                    && p.getAmountInBaseCurrency() != null
                                    && p.getAmountInBaseCurrency().compareTo(java.math.BigDecimal.ZERO) > 0)
                            .map(p -> p.getMethod())
                            .findFirst()
                            .orElse(com.nugar.domain.PaymentMethod.CASH);
                    sale.setPaymentMethod(dominant);
                }
            } else if (sale.getPaymentMethod() == null) {
                sale.setPaymentMethod(com.nugar.domain.PaymentMethod.CASH);
            }
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

            // FIFO Batch Reduction
            int quantityToReduce = item.getQuantity();
            List<com.nugar.domain.InventoryBatch> batches = inventoryBatchRepository
                    .findByProductIdAndCurrentQuantityGreaterThanOrderByCreatedAtAsc(product.getId(), 0);
            for (com.nugar.domain.InventoryBatch batch : batches) {
                if (quantityToReduce <= 0) break;
                
                int batchQty = batch.getCurrentQuantity();
                if (batchQty <= quantityToReduce) {
                    batch.setCurrentQuantity(0);
                    quantityToReduce -= batchQty;
                } else {
                    batch.setCurrentQuantity(batchQty - quantityToReduce);
                    quantityToReduce = 0;
                }
                inventoryBatchRepository.save(batch);
            }

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
            java.math.BigDecimal totalPaidBase = java.math.BigDecimal.ZERO;
            for (SalePayment payment : sale.getPayments()) {
                payment.setSale(sale);
                // Ensure amountInBaseCurrency is calculated if not provided
                if (payment.getAmountInBaseCurrency() == null && payment.getExchangeRate() != null && payment.getExchangeRate().compareTo(java.math.BigDecimal.ZERO) > 0) {
                     payment.setAmountInBaseCurrency(payment.getAmount().divide(payment.getExchangeRate(), 2, java.math.RoundingMode.HALF_UP));
                }
                totalPaidBase = totalPaidBase.add(payment.getAmountInBaseCurrency());
            }

            // If total paid is greater than computed total, record the change as a negative cash payment
            java.math.BigDecimal change = totalPaidBase.subtract(computedTotal);
            if (change.compareTo(java.math.BigDecimal.ZERO) > 0) {
                SalePayment changePayment = new SalePayment();
                changePayment.setSale(sale);
                changePayment.setMethod(com.nugar.domain.PaymentMethod.CASH);
                changePayment.setAmount(change.negate());
                changePayment.setAmountInBaseCurrency(change.negate());
                changePayment.setExchangeRate(java.math.BigDecimal.ONE);
                // Try to infer base currency from other payments, default to USD if not found
                String baseCurrency = sale.getPayments().get(0).getCurrencyCode();
                changePayment.setCurrencyCode(baseCurrency != null ? baseCurrency : "USD"); 
                sale.getPayments().add(changePayment);
            }
        }

        saleRepository.save(sale);

        String itemsDetail = sale.getItems().stream()
                .map(i -> i.getQuantity() + "x " + i.getProduct().getName())
                .collect(Collectors.joining(", "));

        BusinessLogger.log(log, "NUEVA_VENTA", data -> {
            data.put("cajero", cashier != null ? cashier.getUsername() : "Sistema");
            data.put("empresa", company.getName());
            data.put("facturaId", sale.getId());
            data.put("cliente", sale.getCustomerName() != null ? sale.getCustomerName() : "Publico General");
            data.put("estado", sale.getStatus());
            data.put("totalUSD", sale.getTotalAmount());

            // Pagos detallados
            if (sale.getPayments() != null && !sale.getPayments().isEmpty()) {
                java.util.List<java.util.Map<String, Object>> pagos = new java.util.ArrayList<>();
                for (SalePayment p : sale.getPayments()) {
                    java.util.Map<String, Object> pago = new java.util.LinkedHashMap<>();
                    pago.put("metodo", p.getMethod() != null ? p.getMethod().name() : "CASH");
                    pago.put("moneda", p.getCurrencyCode() != null ? p.getCurrencyCode() : "USD");
                    pago.put("monto", p.getAmount());
                    if (p.getAmountInBaseCurrency() != null && !p.getAmountInBaseCurrency().equals(p.getAmount())) {
                        pago.put("montoUSD", p.getAmountInBaseCurrency());
                        pago.put("tasa", p.getExchangeRate());
                    }
                    pagos.add(pago);
                }
                data.put("pagos", pagos);
            }

            // Productos
            java.util.List<java.util.Map<String, Object>> detalle = new java.util.ArrayList<>();
            for (SaleItem i : sale.getItems()) {
                java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("producto", i.getProduct().getName());
                item.put("cantidad", i.getQuantity());
                item.put("precioUnit", i.getUnitPrice());
                item.put("subtotal", i.getSubtotal());
                detalle.add(item);
            }
            data.put("detalle", detalle);
        });

        // Notify store owner about new marketplace order (PENDING orders only)
        if (SaleStatus.PENDING.equals(sale.getStatus())) {
            try {
                // Find the store manager's email
                List<User> managers = userRepository.findByCompanyIdAndRolesContaining(
                        company.getId(), Role.ROLE_MANAGER);
                if (!managers.isEmpty()) {
                    String orderSummary = sale.getItems().stream()
                            .map(i -> i.getQuantity() + "x " + i.getProduct().getName())
                            .collect(Collectors.joining("\n"));
                    java.math.BigDecimal total = sale.getItems().stream()
                            .map(i -> i.getProduct().getPrice().multiply(new java.math.BigDecimal(i.getQuantity())))
                            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
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
    public void updateSaleStatus(Long id, com.nugar.domain.SaleStatus status,
            com.nugar.domain.PaymentMethod paymentMethod, UserDetailsImpl userDetails) {
        Sale sale = saleRepository.findById(id).orElse(null);
        if (sale == null || !sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new RuntimeException("Error: Sale not found or access denied.");
        }

        // Restore stock if cancelling an order that had reserved stock
        if (com.nugar.domain.SaleStatus.CANCELLED.equals(status)
                && !com.nugar.domain.SaleStatus.CANCELLED.equals(sale.getStatus())) {
            
            StringBuilder stockRestored = new StringBuilder();

            if (sale.getItems() != null) {
                for (SaleItem item : sale.getItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        product.setStock(product.getStock() + item.getQuantity());
                        productRepository.save(product);
                        stockRestored.append("+").append(item.getQuantity()).append(" ").append(product.getName()).append(", ");
                    }
                }
            }
            BusinessLogger.warn(log, "VENTA_CANCELADA", data -> {
                data.put("canceladoPor", userDetails.getUsername());
                data.put("empresa", sale.getCompany().getName());
                data.put("facturaId", sale.getId());
                data.put("cliente", sale.getCustomerName() != null ? sale.getCustomerName() : "Publico General");
                data.put("montoOriginalUSD", sale.getTotalAmount());
                java.util.List<java.util.Map<String, Object>> stockDevuelto = new java.util.ArrayList<>();
                if (sale.getItems() != null) {
                    for (SaleItem item : sale.getItems()) {
                        if (item.getProduct() != null) {
                            java.util.Map<String, Object> s = new java.util.LinkedHashMap<>();
                            s.put("producto", item.getProduct().getName());
                            s.put("cantidadDevuelta", item.getQuantity());
                            stockDevuelto.add(s);
                        }
                    }
                }
                data.put("stockRestaurado", stockDevuelto);
            });
        }

        sale.setStatus(status);

        // If updating to PAID, set the payment method if provided
        if (com.nugar.domain.SaleStatus.PAID.equals(status)) {
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

        log.info("[VENTA_ESTADO] Por: {} | Empresa: {} | Factura ID: {} | Cliente: {} | Monto: ${} | {} -> {}", 
            userDetails.getUsername(),
            sale.getCompany().getName(),
            sale.getId(),
            sale.getCustomerName() != null ? sale.getCustomerName() : "Publico General",
            sale.getTotalAmount(),
            sale.getPaymentMethod() != null ? sale.getPaymentMethod() : "SIN METODO",
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
