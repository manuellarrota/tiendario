package com.tiendario.payload.response;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SellerOfferDTO {
    private Long productId;
    private Long companyId;
    private String companyName;
    private BigDecimal price;
    private Integer stock;
    private String subscriptionStatus;
    private Double latitude;
    private Double longitude;
    private String description;
    private String imageUrl;
}
