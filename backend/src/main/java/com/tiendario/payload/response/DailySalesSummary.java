package com.tiendario.payload.response;

import com.tiendario.domain.PaymentMethod;
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
