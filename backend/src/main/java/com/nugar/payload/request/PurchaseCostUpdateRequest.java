package com.nugar.payload.request;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PurchaseCostUpdateRequest {
    private List<ItemCostUpdate> items;

    @Data
    public static class ItemCostUpdate {
        private Long purchaseItemId;
        private BigDecimal newUnitCost;
    }
}
