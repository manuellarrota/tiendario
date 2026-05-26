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

    public ByteArrayInputStream exportToExcel(Long companyId) throws IOException {
        List<Product> products = productRepository.findByCompanyId(companyId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Inventario");

            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = { "SKU (Obligatorio)", "Nombre", "Categoría", "Presentación/Variante", "Precio Venta", "Precio Costo",
                    "Stock Actual", "Stock Mínimo", "Descripción" };
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

            String[] headers = { "SKU", "Producto", "Categoría", "Stock", "Precio", "Costo" };
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

    public List<String> importFromExcel(MultipartFile file, Long companyId) throws IOException {
        List<String> logs = new ArrayList<>();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) {
                logs.add("Archivo vacío.");
                return logs;
            }

            // Skip header
            rows.next();

            int count = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();
                try {
                    String sku = getCellValueAsString(currentRow.getCell(0));
                    if (sku == null || sku.isEmpty())
                        continue;

                    String name = getCellValueAsString(currentRow.getCell(1));
                    String category = getCellValueAsString(currentRow.getCell(2));
                    String variant = getCellValueAsString(currentRow.getCell(3));
                    BigDecimal price = getCellValueAsBigDecimal(currentRow.getCell(4));
                    BigDecimal costPrice = getCellValueAsBigDecimal(currentRow.getCell(5));
                    Integer stock = getCellValueAsInteger(currentRow.getCell(6));
                    Integer minStock = getCellValueAsInteger(currentRow.getCell(7));
                    String description = getCellValueAsString(currentRow.getCell(8));

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
                    logs.add("Error en fila " + (currentRow.getRowNum() + 1) + ": " + e.getMessage());
                }
            }
            logs.add("Importación completada: " + count + " productos procesados.");
            org.slf4j.LoggerFactory.getLogger(InventoryService.class).info("[IMPORT_EXCEL] Empresa ID: {} | Productos procesados: {}", companyId, count);
        }
        return logs;
    }

    public List<String> uploadAndGetHeaders(MultipartFile file, String fileId) throws IOException {
        File tempFile = new File(System.getProperty("java.io.tmpdir"), fileId + ".xlsx");
        file.transferTo(tempFile);
        
        List<String> headers = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(tempFile)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow != null) {
                for (Cell cell : headerRow) {
                    headers.add(getCellValueAsString(cell));
                }
            }
        } catch (org.apache.poi.openxml4j.exceptions.InvalidFormatException e) {
            throw new IOException("Formato de Excel inválido", e);
        }

        return headers;
    }

    public com.nugar.payload.response.ImportPreviewResponse generatePreview(com.nugar.payload.request.ImportSettingsRequest settings, Long companyId) throws IOException {
        File tempFile = new File(System.getProperty("java.io.tmpdir"), settings.getFileId() + ".xlsx");
        if (!tempFile.exists()) throw new RuntimeException("Archivo temporal no encontrado.");

        com.nugar.payload.response.ImportPreviewResponse response = new com.nugar.payload.response.ImportPreviewResponse();
        List<Map<String, String>> sampleNew = new ArrayList<>();
        List<Map<String, String>> sampleModified = new ArrayList<>();
        List<Map<String, String>> sampleConflicts = new ArrayList<>();
        int newCount = 0, modCount = 0, conflictCount = 0, dupCount = 0;

        try (Workbook workbook = new XSSFWorkbook(tempFile)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            if (rows.hasNext()) rows.next(); // skip header

            while (rows.hasNext()) {
                Row row = rows.next();
                try {
                    Map<String, Integer> map = settings.getColumnMapping();
                    String sku = map.containsKey("sku") && map.get("sku") != null ? getCellValueAsString(row.getCell(map.get("sku"))) : null;
                    if (sku == null || sku.trim().isEmpty()) continue;
                    
                    String name = map.containsKey("name") && map.get("name") != null ? getCellValueAsString(row.getCell(map.get("name"))) : "";
                    
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
                    err.put("error", "Fila " + (row.getRowNum() + 1) + ": " + e.getMessage());
                    if (sampleConflicts.size() < 5) sampleConflicts.add(err);
                }
            }
        } catch (org.apache.poi.openxml4j.exceptions.InvalidFormatException e) {
            throw new IOException("Formato de Excel inválido", e);
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
        File tempFile = new File(System.getProperty("java.io.tmpdir"), settings.getFileId() + ".xlsx");
        if (!tempFile.exists()) return;

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) return;

        boolean soloStock = "SOLO_STOCK".equalsIgnoreCase(settings.getMode());

        try (Workbook workbook = new XSSFWorkbook(tempFile)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            if (rows.hasNext()) rows.next(); // skip header

            int count = 0;
            while (rows.hasNext()) {
                Row row = rows.next();
                try {
                    Map<String, Integer> map = settings.getColumnMapping();
                    String sku = map.containsKey("sku") && map.get("sku") != null ? getCellValueAsString(row.getCell(map.get("sku"))) : null;
                    if (sku == null || sku.trim().isEmpty()) continue;

                    Product product = productRepository.findBySkuAndCompanyId(sku, companyId).orElse(new Product());
                    
                    if (!soloStock) {
                        if (map.containsKey("name") && map.get("name") != null) product.setName(getCellValueAsString(row.getCell(map.get("name"))));
                        if (map.containsKey("category") && map.get("category") != null) product.setCategory(getCellValueAsString(row.getCell(map.get("category"))));
                        if (map.containsKey("price") && map.get("price") != null) product.setPrice(getCellValueAsBigDecimal(row.getCell(map.get("price"))));
                        if (map.containsKey("costPrice") && map.get("costPrice") != null) product.setCostPrice(getCellValueAsBigDecimal(row.getCell(map.get("costPrice"))));
                        if (map.containsKey("variant") && map.get("variant") != null) product.setVariant(getCellValueAsString(row.getCell(map.get("variant"))));
                        if (map.containsKey("minStock") && map.get("minStock") != null) product.setMinStock(getCellValueAsInteger(row.getCell(map.get("minStock"))));
                        if (map.containsKey("description") && map.get("description") != null) product.setDescription(getCellValueAsString(row.getCell(map.get("description"))));
                    }
                    if (map.containsKey("stock") && map.get("stock") != null) {
                        Integer st = getCellValueAsInteger(row.getCell(map.get("stock")));
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
        String[] columns = { "SKU (Obligatorio)", "Nombre", "Categoría", "Presentación/Variante", "Precio Venta",
                "Precio Costo", "Stock Actual", "Stock Mínimo", "Descripción" };

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Importar Productos");

            // Row 0: Headers
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
            }

            // Row 1: Example Data
            Row exampleRow = sheet.createRow(1);
            exampleRow.createCell(0).setCellValue("PROD-001");
            exampleRow.createCell(1).setCellValue("Producto de Ejemplo");
            exampleRow.createCell(2).setCellValue("General");
            exampleRow.createCell(3).setCellValue("Única");
            exampleRow.createCell(4).setCellValue(1500.0);
            exampleRow.createCell(5).setCellValue(1000.0);
            exampleRow.createCell(6).setCellValue(10);
            exampleRow.createCell(7).setCellValue(2);
            exampleRow.createCell(8).setCellValue("Breve descripción del producto");

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null)
            return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return null;
        }
    }

    private BigDecimal getCellValueAsBigDecimal(Cell cell) {
        if (cell == null)
            return BigDecimal.ZERO;
        if (cell.getCellType() == CellType.NUMERIC)
            return BigDecimal.valueOf(cell.getNumericCellValue());
        if (cell.getCellType() == CellType.STRING) {
            try {
                return new BigDecimal(cell.getStringCellValue());
            } catch (Exception e) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null)
            return 0;
        if (cell.getCellType() == CellType.NUMERIC)
            return (int) cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Integer.parseInt(cell.getStringCellValue());
            } catch (Exception e) {
                return 0;
            }
        }
        return 0;
    }
}
