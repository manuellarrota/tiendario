package com.nugar.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;
import jakarta.persistence.*;

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

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    private java.util.Set<Role> roles = new java.util.HashSet<>();

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
