package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ManyToOne
    @JoinColumn(name = "company_id")
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Company company; // Null for ADMIN or CLIENT

    private boolean enabled = true;

    private Integer points = 0;

    private String verificationCode;

    private String resetToken;
    private java.time.LocalDateTime resetTokenExpiry;

    private String fullName;
    private String cedula;
    private String phone;
    private String address;
}
