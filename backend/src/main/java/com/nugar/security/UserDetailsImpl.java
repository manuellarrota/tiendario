package com.nugar.security;

import com.nugar.domain.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.Objects;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String username;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;
    private Long companyId;
    private boolean enabled;
    private String email;
    private String fullName;
    private String cedula;
    private String phone;
    private String address;

    public UserDetailsImpl(Long id, String username, String email, String password,
            Collection<? extends GrantedAuthority> authorities, Long companyId, boolean enabled,
            String fullName, String cedula, String phone, String address) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.companyId = companyId;
        this.enabled = enabled;
        this.fullName = fullName;
        this.cedula = cedula;
        this.phone = phone;
        this.address = address;
    }

    public UserDetailsImpl(Long id, String username, String password,
            Collection<? extends GrantedAuthority> authorities, Long companyId, boolean enabled) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.authorities = authorities;
        this.companyId = companyId;
        this.enabled = enabled;
    }

    public static UserDetailsImpl build(User user) {
        java.util.List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.name()))
                .collect(java.util.stream.Collectors.toList());

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                authorities,
                user.getCompany() != null ? user.getCompany().getId() : null,
                user.isEnabled(),
                user.getFullName(),
                user.getCedula(),
                user.getPhone(),
                user.getAddress());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getCedula() { return cedula; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }
}
