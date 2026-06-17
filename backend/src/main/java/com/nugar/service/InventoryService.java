package com.nugar.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.nugar.domain.Company;
import com.nugar.domain.Product;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.csv.CSVPrinter;
import java.io.FileReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.io.Reader;
import java.io.Writer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.io.File;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;
    private final ProductIndexService productIndexService;
    private final com.nugar.repository.CategoryRepository categoryRepository;
    private final com.nugar.repository.CategorySuggestionRepository categorySuggestionRepository;
    private final com.nugar.repository.CategoryMappingRepository categoryMappingRepository;
    private final com.nugar.repository.CatalogProductRepository catalogProductRepository;

    public ByteArrayInputStream exportToExcel(Long companyId) throws IOException {
        List<Product> products = productRepository.findByCompanyId(companyId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Inventario");

            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = { "SKU (Obligatorio)", "Nombre", "CategorÃ­a", "PresentaciÃ³n/Variante", "Precio Venta", "Precio Costo",
                    "Stock Actual", "Stock MÃ­nimo", "DescripciÃ³n" };
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                CellStyle headerStyle = workbook.createCellStyle();
                org.apache.poi.ss.usermodel.Font font = workbook.createFont();
                font.setBold(true);
                headerStyle.setFont(font);
                cell.setCellStyle(headerStyle);
            }

            // Data
            int rowIdx = 1;
            for (Product product : products) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(product.getSku());
                row.createCell(1).setCellValue(product.getName());
                row.createCell(2).setCellValue(product.getCategory());
                row.createCell(3).setCellValue(product.getVariant());
                row.createCell(4).setCellValue(product.getPrice() != null ? product.getPrice().doubleValue() : 0.0);
                row.createCell(5)
                        .setCellValue(product.getCostPrice() != null ? product.getCostPrice().doubleValue() : 0.0);
                row.createCell(6).setCellValue(product.getStock() != null ? product.getStock() : 0);
                row.createCell(7).setCellValue(product.getMinStock() != null ? product.getMinStock() : 0);
                row.createCell(8).setCellValue(product.getDescription());
            }

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    public ByteArrayInputStream exportToPdf(Long companyId) throws IOException {
        List<Product> products = productRepository.findByCompanyId(companyId);
        Company company = companyRepository.findById(companyId).orElse(null);

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph(
                    "Reporte de Inventario - " + (company != null ? company.getName() : "Nugar"), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Table
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[] { 3, 4, 3, 2, 2, 2 });

            String[] headers = { "SKU", "Producto", "CategorÃ­a", "Stock", "Precio", "Costo" };
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            for (Product p : products) {
                table.addCell(p.getSku());
                table.addCell(p.getName());
                table.addCell(p.getCategory() != null ? p.getCategory() : "-");
                table.addCell(String.valueOf(p.getStock()));
                table.addCell("$" + p.getPrice());
                table.addCell("$" + p.getCostPrice());
            }

            document.add(table);
            document.close();
        } catch (DocumentException e) {
            throw new IOException(e.getMessage());
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    public List<String> importFromCsv(MultipartFile file, Long companyId) throws IOException {
        List<String> logs = new ArrayList<>();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT)) {
            Iterator<CSVRecord> rows = csvParser.iterator();

            if (!rows.hasNext()) {
                logs.add("Archivo vacÃ­o.");
                return logs;
            }

            // Skip header
            rows.next();

            int count = 0;
            long rowNum = 1;
            while (rows.hasNext()) {
                CSVRecord currentRow = rows.next();
                rowNum++;
                try {
                    String sku = getCsvValueAsString(currentRow, 0);
                    if (sku == null || sku.isEmpty())
                        continue;

                    String name = getCsvValueAsString(currentRow, 1);
                    String category = getCsvValueAsString(currentRow, 2);
                    processCategorySuggestion(category, companyId);
                    String variant = getCsvValueAsString(currentRow, 3);
                    BigDecimal price = getCsvValueAsBigDecimal(currentRow, 4);
                    BigDecimal costPrice = getCsvValueAsBigDecimal(currentRow, 5);
                    Integer stock = getCsvValueAsInteger(currentRow, 6);
                    Integer minStock = getCsvValueAsInteger(currentRow, 7);
                    String description = getCsvValueAsString(currentRow, 8);

                    Product product = productRepository.findBySkuAndCompanyId(sku, companyId).orElse(new Product());
                    product.setSku(sku);
                    product.setName(name);
                    product.setCategory(category);
                    product.setVariant(variant);
                    product.setPrice(price);
                    product.setCostPrice(costPrice);
                    product.setStock(stock);
                    product.setMinStock(minStock);
                    product.setDescription(description);
                    product.setCompany(company);

                    Product saved = productRepository.save(product);
                    productIndexService.indexProduct(saved);
                    count++;
                } catch (Exception e) {
                    logs.add("Error en fila " + rowNum + ": " + e.getMessage());
                }
            }
            logs.add("ImportaciÃ³n completada: " + count + " productos procesados.");
            org.slf4j.LoggerFactory.getLogger(InventoryService.class).info("[IMPORT_CSV] Empresa ID: {} | Productos procesados: {}", companyId, count);
        }
        return logs;
    }

    public List<String> uploadAndGetHeaders(MultipartFile file, String fileId) throws IOException {
        File tempFile = new File(System.getProperty("java.io.tmpdir"), fileId + ".csv");
        file.transferTo(tempFile);
        
        List<String> headers = new ArrayList<>();
        try (Reader reader = new FileReader(tempFile, StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT)) {
            Iterator<CSVRecord> iterator = csvParser.iterator();
            if (iterator.hasNext()) {
                CSVRecord headerRecord = iterator.next();
                for (int i = 0; i < headerRecord.size(); i++) {
                    headers.add(headerRecord.get(i));
                }
            }
        } catch (Exception e) {
            throw new IOException("Formato de CSV invÃ¡lido", e);
        }

        return headers;
    }

    public com.nugar.payload.response.ImportPreviewResponse generatePreview(com.nugar.payload.request.ImportSettingsRequest settings, Long companyId) throws IOException {
        File tempFile = new File(System.getProperty("java.io.tmpdir"), settings.getFileId() + ".csv");
        if (!tempFile.exists()) throw new RuntimeException("Archivo temporal no encontrado.");

        com.nugar.payload.response.ImportPreviewResponse response = new com.nugar.payload.response.ImportPreviewResponse();
        List<Map<String, String>> sampleNew = new ArrayList<>();
        List<Map<String, String>> sampleModified = new ArrayList<>();
        List<Map<String, String>> sampleConflicts = new ArrayList<>();
        int newCount = 0, modCount = 0, conflictCount = 0, dupCount = 0;

        try (Reader reader = new FileReader(tempFile, StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT)) {
            Iterator<CSVRecord> rows = csvParser.iterator();
            if (rows.hasNext()) rows.next(); // skip header

            long rowNum = 1;
            while (rows.hasNext()) {
                CSVRecord row = rows.next();
                rowNum++;
                try {
                    Map<String, Integer> map = settings.getColumnMapping();
                    String sku = map.containsKey("sku") ? getCsvValueAsString(row, map.get("sku")) : null;
                    if (sku == null || sku.trim().isEmpty()) continue;
                    
                    String name = map.containsKey("name") ? getCsvValueAsString(row, map.get("name")) : "";
                    if (name == null) name = "";
                    
                    java.util.Optional<Product> existingOpt = productRepository.findBySkuAndCompanyId(sku, companyId);
                    
                    Map<String, String> item = new java.util.HashMap<>();
                    item.put("sku", sku);
                    item.put("name", name);

                    if (existingOpt.isPresent()) {
                        modCount++;
                        if (sampleModified.size() < 5) sampleModified.add(item);
                    } else {
                        newCount++;
                        if (sampleNew.size() < 5) sampleNew.add(item);
                    }
                } catch (Exception e) {
                    conflictCount++;
                    Map<String, String> err = new java.util.HashMap<>();
                    err.put("error", "Fila " + rowNum + ": " + e.getMessage());
                    if (sampleConflicts.size() < 5) sampleConflicts.add(err);
                }
            }
        } catch (Exception e) {
            throw new IOException("Formato de CSV invÃ¡lido", e);
        }

        response.setTotalRows(newCount + modCount + conflictCount + dupCount);
        response.setNewProducts(newCount);
        response.setModifiedProducts(modCount);
        response.setConflicts(conflictCount);
        response.setDuplicates(dupCount);
        response.setSampleNew(sampleNew);
        response.setSampleModified(sampleModified);
        response.setSampleConflicts(sampleConflicts);
        return response;
    }

    @org.springframework.scheduling.annotation.Async
    public void executeImportAsync(com.nugar.payload.request.ImportSettingsRequest settings, Long companyId) {
        File tempFile = new File(System.getProperty("java.io.tmpdir"), settings.getFileId() + ".csv");
        if (!tempFile.exists()) return;

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) return;

        boolean soloStock = "SOLO_STOCK".equalsIgnoreCase(settings.getMode());

        try (Reader reader = new FileReader(tempFile, StandardCharsets.UTF_8);
             CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT)) {
            Iterator<CSVRecord> rows = csvParser.iterator();
            if (rows.hasNext()) rows.next(); // skip header

            int count = 0;
            while (rows.hasNext()) {
                CSVRecord row = rows.next();
                try {
                    Map<String, Integer> map = settings.getColumnMapping();
                    String sku = map.containsKey("sku") ? getCsvValueAsString(row, map.get("sku")) : null;
                    if (sku == null || sku.trim().isEmpty()) continue;

                    Product product = productRepository.findBySkuAndCompanyId(sku, companyId).orElse(new Product());
                    
                    if (!soloStock) {
                        if (map.containsKey("name")) product.setName(getCsvValueAsString(row, map.get("name")));
                        if (map.containsKey("category")) {
                            String cat = getCsvValueAsString(row, map.get("category"));
                            product.setCategory(cat);
                            processCategorySuggestion(cat, companyId);
                        }
                        if (map.containsKey("price")) product.setPrice(getCsvValueAsBigDecimal(row, map.get("price")));
                        if (map.containsKey("costPrice")) product.setCostPrice(getCsvValueAsBigDecimal(row, map.get("costPrice")));
                        if (map.containsKey("variant")) product.setVariant(getCsvValueAsString(row, map.get("variant")));
                        if (map.containsKey("minStock")) product.setMinStock(getCsvValueAsInteger(row, map.get("minStock")));
                        if (map.containsKey("description")) product.setDescription(getCsvValueAsString(row, map.get("description")));
                    }
                    if (map.containsKey("stock")) {
                        Integer st = getCsvValueAsInteger(row, map.get("stock"));
                        if ("ANEXAR".equalsIgnoreCase(settings.getMode()) && product.getStock() != null) {
                            product.setStock(product.getStock() + st);
                        } else {
                            product.setStock(st);
                        }
                    }
                    
                    product.setSku(sku);
                    product.setCompany(company);

                    Product saved = productRepository.save(product);
                    productIndexService.indexProduct(saved);
                    syncToCatalog(saved);
                    count++;
                } catch (Exception ignored) { }
            }
            org.slf4j.LoggerFactory.getLogger(InventoryService.class).info("[IMPORT_ASYNC] Empresa ID: {} | Productos procesados: {}", companyId, count);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(InventoryService.class).error("Error en import async", e);
        } finally {
            tempFile.delete(); // Clean up
        }
    }

    public ByteArrayInputStream generateExcelTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Formato de Carga");

            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = { "SKU (Obligatorio)", "Nombre", "Categoría", "Presentación/Variante", "Precio Venta",
                    "Precio Costo", "Stock Actual", "Stock Mínimo", "Descripción" };
            
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Example Data Row
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("PROD-001");
            row.createCell(1).setCellValue("Producto de Ejemplo");
            row.createCell(2).setCellValue("General");
            row.createCell(3).setCellValue("Única");
            row.createCell(4).setCellValue(1500.0);
            row.createCell(5).setCellValue(1000.0);
            row.createCell(6).setCellValue(10);
            row.createCell(7).setCellValue(2);
            row.createCell(8).setCellValue("Breve descripción del producto");

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private String getCsvValueAsString(CSVRecord record, Integer index) {
        if (index == null || index < 0 || index >= record.size()) return null;
        return sanitizeString(record.get(index));
    }

    private BigDecimal getCsvValueAsBigDecimal(CSVRecord record, Integer index) {
        if (index == null || index < 0 || index >= record.size()) return BigDecimal.ZERO;
        String val = record.get(index);
        if (val == null || val.trim().isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(val.trim());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private Integer getCsvValueAsInteger(CSVRecord record, Integer index) {
        if (index == null || index < 0 || index >= record.size()) return 0;
        String val = record.get(index);
        if (val == null || val.trim().isEmpty()) return 0;
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    private String sanitizeString(String input) {
        if (input == null) return null;
        String sanitized = input.trim();
        // Remove simple HTML tags
        sanitized = sanitized.replaceAll("<[^>]*>", "");
        // Prevent formula injection
        if (sanitized.startsWith("=") || sanitized.startsWith("@") || sanitized.startsWith("+") || sanitized.startsWith("-")) {
            // For numbers, + and - might be valid, but this method is primarily for strings.
            // If it's a number being processed as string, it will be stripped.
            // Let's be careful. Actually, + and - are only dangerous if Excel evaluates them.
            // Let's strip only = and @ for strings to be safe without breaking negative text.
            if (sanitized.startsWith("=") || sanitized.startsWith("@")) {
                sanitized = sanitized.substring(1).trim();
            }
        }
        return sanitized.isEmpty() ? null : sanitized;
    }

    private void processCategorySuggestion(String categoryName, Long companyId) {
        if (categoryName == null || categoryName.trim().isEmpty()) return;
        String name = categoryName.trim();
        
        // Check if it exists globally
        if (categoryRepository.findFirstByNameIgnoreCase(name).isPresent()) return;
        
        // Check if mapped
        if (categoryMappingRepository.findByLocalCategoryNameIgnoreCase(name).isPresent()) return;
        
        // Check if suggestion already exists
        if (categorySuggestionRepository.findByStoreId(companyId).stream()
                .anyMatch(s -> s.getName().equalsIgnoreCase(name))) return;
                
        com.nugar.domain.CategorySuggestion suggestion = new com.nugar.domain.CategorySuggestion();
        suggestion.setStoreId(companyId);
        suggestion.setName(name);
        suggestion.setStatus(com.nugar.domain.SuggestionStatus.PENDING);
        categorySuggestionRepository.save(suggestion);
    }

    private void syncToCatalog(Product product) {
        if (product.getSku() == null || product.getSku().trim().isEmpty()) return;
        String sku = product.getSku().trim();
        if (catalogProductRepository.findBySku(sku).isPresent()) return;
        com.nugar.domain.CatalogProduct cp = new com.nugar.domain.CatalogProduct();
        cp.setSku(sku);
        cp.setName(product.getName());
        cp.setDescription(product.getDescription());
        cp.setImageUrl(product.getImageUrl());
        cp.setBrand(product.getBrand());
        if (product.getCategory() != null && !product.getCategory().isEmpty()) {
            categoryRepository.findFirstByNameIgnoreCase(product.getCategory().trim())
                    .ifPresent(cp::setCategory);
        }
        catalogProductRepository.save(cp);
    }
}
