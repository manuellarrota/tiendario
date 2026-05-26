package com.nugar.payload.response;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ImportPreviewResponse {
    private int totalRows;
    private int newProducts;
    private int modifiedProducts;
    private int conflicts;
    private int duplicates;
    
    private List<Map<String, String>> sampleNew;
    private List<Map<String, String>> sampleModified;
    private List<Map<String, String>> sampleConflicts;
}
