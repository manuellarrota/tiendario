package com.tiendario.payload.response;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PublicProductDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private String imageUrl;
    private Long companyId;
    private String companyName;
    private String sku;
    private String brand;
    private String category;
    private String subscriptionStatus;
    private Double rating;
    private Integer ratingCount;
    private Double distance;
}
