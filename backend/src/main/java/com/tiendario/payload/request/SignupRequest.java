package com.tiendario.payload.request;

import lombok.Data;
import java.util.Set;

@Data
public class SignupRequest {
    private String username;
    private String password;
    private Set<String> role;

    // For MANAGER
    private String companyName;
    private Double latitude;
    private Double longitude;
}
