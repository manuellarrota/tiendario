package com.tiendario.payload.response;

import lombok.Data;
import java.util.List;

@Data
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String username;
    private List<String> roles;
    private Long companyId;
    private String subscriptionStatus;

    public JwtResponse(String accessToken, Long id, String username, List<String> roles, Long companyId,
            String subscriptionStatus) {
        this.token = accessToken;
        this.id = id;
        this.username = username;
        this.roles = roles;
        this.companyId = companyId;
        this.subscriptionStatus = subscriptionStatus;
    }
}
