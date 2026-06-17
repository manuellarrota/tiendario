package com.nugar.payload.response;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductHistoryResponse {
    private List<MonthlyData> monthlyData;

    @Data
    public static class MonthlyData {
        private String month; // e.g. "2023-01"
        private String label; // e.g. "Ene 23"
        private BigDecimal avgCost;
        private BigDecimal avgPrice;
        
        public MonthlyData(String month, String label, BigDecimal avgCost, BigDecimal avgPrice) {
            this.month = month;
            this.label = label;
            this.avgCost = avgCost;
            this.avgPrice = avgPrice;
        }
    }
}
