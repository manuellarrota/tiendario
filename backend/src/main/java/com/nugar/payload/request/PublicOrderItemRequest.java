package com.nugar.payload.request;

import lombok.Data;

@Data
public class PublicOrderItemRequest {
    private Long productId;
    private Integer quantity;
}
