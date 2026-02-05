package com.tiendario.payload.request;

import lombok.Data;

@Data
public class PublicOrderRequest {
    private Long productId;
    private Integer quantity;

    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerAddress;
}
