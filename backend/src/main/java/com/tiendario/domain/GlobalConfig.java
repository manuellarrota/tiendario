package com.tiendario.domain;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "global_configs")
public class GlobalConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Plan settings
    private Integer freePlanProductLimit = 20;
    private BigDecimal premiumPlanMonthlyPrice = new BigDecimal("25.00");
    private Integer trialDays = 30;

    // Marketplace settings
    private boolean maintenanceMode = false;
    private String announcementMessage = "¡Bienvenidos a Tiendario!";

    // Support info
    private String contactEmail = "soporte@tiendario.com";
    private String contactPhone = "+58 412 0000000";

    // Currency Settings (e.g., USD to VES)
    private BigDecimal exchangeRate = new BigDecimal("36.50");
    private boolean enableSecondaryCurrency = true;
    private String secondaryCurrencyLabel = "VES";
    private String secondaryCurrencySymbol = "Bs.";
}
