package com.tiendario.service;

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
import com.tiendario.domain.Company;
import com.tiendario.domain.Product;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
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
            String[] columns = { "SKU", "Nombre", "Categoría", "Variante", "Precio Venta", "Precio Costo",
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
                    "Reporte de Inventario - " + (company != null ? company.getName() : "Tiendario"), titleFont);
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
        }
        return logs;
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
