package com.tiendario.payload.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PurchaseRequest {
    private Long supplierId;
    private BigDecimal total;
    private String currencyCode = "USD";
    private BigDecimal exchangeRate = BigDecimal.ONE;
    private BigDecimal totalInBaseCurrency;
    private com.tiendario.domain.PaymentMethod paymentMethod;
    private List<PurchaseItemRequest> items;

    @Data
    public static class PurchaseItemRequest {
        private Long productId;
        private Integer quantity;
        private BigDecimal unitCost;
        private BigDecimal unitCostInBaseCurrency;
        private BigDecimal subtotalInBaseCurrency;
    }
}
