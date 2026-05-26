package com.nugar.payload.request;

import lombok.Data;
import java.util.Map;

@Data
public class ImportSettingsRequest {
    private String fileId;
    private String mode; // ANEXAR, ACTUALIZAR, REEMPLAZAR, SOLO_STOCK
    private Map<String, Integer> columnMapping;
}
