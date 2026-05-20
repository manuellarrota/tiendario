package com.nugar.payload.response;

import com.nugar.domain.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class DailySalesSummary {
    private String username;
    private PaymentMethod paymentMethod;
    private Long saleCount;
    private BigDecimal totalAmount;
}
