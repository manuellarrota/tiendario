package com.nugar.domain;

import lombok.Data;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "global_configs")
public class GlobalConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Plan settings
    private BigDecimal basicPlanMonthlyPrice = new BigDecimal("19.99");
    private BigDecimal mediumPlanMonthlyPrice = new BigDecimal("29.99");
    private BigDecimal premiumPlanMonthlyPrice = new BigDecimal("49.99"); // Changed to 49.99 to match frontend defaults
    private BigDecimal extraRegisterMonthlyPrice = new BigDecimal("5.00");
    private Integer trialDays = 30;

    // Marketplace settings
    private boolean maintenanceMode = false;
    private String announcementMessage = "¡Bienvenidos a Nugar!";

    // Support info
    private String contactEmail = "soporte@nugar.com";
    private String contactPhone = "+58 412 0000000";

    // Legacy single-currency fields (kept for backward compat)
    private BigDecimal exchangeRate = new BigDecimal("36.50");
    private boolean enableSecondaryCurrency = true;
    private String secondaryCurrencyLabel = "VES";
    private String secondaryCurrencySymbol = "Bs.";

    // Base currency for all prices in the platform
    private String baseCurrencyCode = "USD";
    private String baseCurrencySymbol = "$";

    // Multi-currency: JSON array of enabled currencies
    // Format: [{"code":"COP","symbol":"COP$","rate":4200.00,"enabled":true}, ...]
    @Column(columnDefinition = "TEXT")
    private String currencies = "[{\"code\":\"COP\",\"symbol\":\"$\",\"name\":\"Peso Colombiano\",\"rate\":4200.00,\"enabled\":true},{\"code\":\"VES\",\"symbol\":\"Bs.\",\"name\":\"Bolívar\",\"rate\":36.50,\"enabled\":true}]";
}
