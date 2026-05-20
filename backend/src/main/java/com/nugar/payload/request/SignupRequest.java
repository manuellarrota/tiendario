package com.nugar.payload.request;

import lombok.Data;
import java.util.Set;

@Data
public class SignupRequest {
    private String username;
    private String email;
    private String password;
    private Set<String> role;

    // For MANAGER
    private String companyName;
    private Double latitude;
    private Double longitude;
    private String phoneNumber;
    private String address;
    private String fullName;
    private String cedula;
}
