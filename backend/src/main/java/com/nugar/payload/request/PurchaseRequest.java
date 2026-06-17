package com.nugar.payload.request;

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
    private String invoiceNumber;
    private com.nugar.domain.PaymentMethod paymentMethod;
    
    private BigDecimal globalDiscountAmount;
    private com.nugar.domain.DiscountType globalDiscountType;
    
    private List<PurchaseItemRequest> items;

    @Data
    public static class PurchaseItemRequest {
        private Long productId;
        private Integer quantity;
        private BigDecimal unitCost;
        private BigDecimal unitCostInBaseCurrency;
        
        private BigDecimal discountAmount;
        private com.nugar.domain.DiscountType discountType;
        
        private BigDecimal subtotalInBaseCurrency;
    }
}
