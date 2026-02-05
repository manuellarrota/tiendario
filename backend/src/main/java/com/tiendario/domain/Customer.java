package com.tiendario.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "customers")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String phone;
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    private LocalDateTime createdAt;
    private Integer loyaltyPoints = 0;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
