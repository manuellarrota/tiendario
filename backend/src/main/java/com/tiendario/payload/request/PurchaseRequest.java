package com.tiendario.payload.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PurchaseRequest {
    private Long supplierId;
    private BigDecimal total;
    private List<PurchaseItemRequest> items;

    @Data
    public static class PurchaseItemRequest {
        private Long productId;
        private Integer quantity;
        private BigDecimal unitCost;
    }
}
