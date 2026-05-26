package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "companies")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    private SubscriptionStatus subscriptionStatus;

    @Enumerated(EnumType.STRING)
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.BASIC;

    private Boolean hasElectronicBilling = false;
    private Integer extraRegisters = 0;

    private LocalDateTime trialStartDate;
    private LocalDateTime subscriptionEndDate;

    // Geo Location
    private Double latitude;
    private Double longitude;

    private String description;
    private String imageUrl;

    private String phoneNumber;
    private String address;

    // Reputation
    private Double rating;
    private Integer ratingCount;

    // Financial & Operational Configuration
    private String baseCurrency = "USD";
    private String timezone = "America/Caracas";
}
