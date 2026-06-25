package com.nugar.payload.request;

import lombok.Data;

import java.util.List;

@Data
public class PublicOrderRequest {
    private List<PublicOrderItemRequest> items;

    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerCedula;
    private String customerAddress;
}
