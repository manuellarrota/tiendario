package com.nugar.web;

import com.nugar.security.UserDetailsImpl;
import com.nugar.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import com.nugar.payload.request.ImportSettingsRequest;
import com.nugar.payload.response.ImportPreviewResponse;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

        @Autowired
        InventoryService inventoryService;

        @GetMapping("/export/excel")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<Resource> exportToExcel() throws IOException {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();
                org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(InventoryController.class);
                logger.info("📤 [EXPORTAR] Usuario {} está exportando inventario a Excel", userDetails.getUsername());
                ByteArrayInputStream in = inventoryService.exportToExcel(userDetails.getCompanyId());

                HttpHeaders headers = new HttpHeaders();
                headers.add("Content-Disposition", "attachment; filename=inventario.xlsx");

                return ResponseEntity.ok()
                                .headers(headers)
                                .contentType(
                                                MediaType.parseMediaType(
                                                                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(new InputStreamResource(in));
        }

        @GetMapping("/export/pdf")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<Resource> exportToPdf() throws IOException {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();
                org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(InventoryController.class);
                logger.info("📤 [EXPORTAR] Usuario {} está exportando inventario a PDF", userDetails.getUsername());
                ByteArrayInputStream in = inventoryService.exportToPdf(userDetails.getCompanyId());

                HttpHeaders headers = new HttpHeaders();
                headers.add("Content-Disposition", "attachment; filename=inventario.pdf");

                return ResponseEntity.ok()
                                .headers(headers)
                                .contentType(MediaType.APPLICATION_PDF)
                                .body(new InputStreamResource(in));
        }

        @PostMapping("/import")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<List<String>> importCsv(@RequestParam("file") MultipartFile file) throws IOException {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();
                org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(InventoryController.class);
                logger.info("📥 [IMPORTAR] Usuario {} inició importación de inventario desde {}", 
                    userDetails.getUsername(), file.getOriginalFilename());
                List<String> logs = inventoryService.importFromCsv(file, userDetails.getCompanyId());
                return ResponseEntity.ok(logs);
        }

        @PostMapping("/import/upload")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> uploadImportFile(@RequestParam("file") MultipartFile file) {
            org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(InventoryController.class);
            try {
                String fileId = java.util.UUID.randomUUID().toString();
                logger.info("📥 [IMPORT UPLOAD] Archivo recibido: '{}' | Tamaño: {} bytes",
                        file.getOriginalFilename(), file.getSize());
                List<String> headers = inventoryService.uploadAndGetHeaders(file, fileId);
                java.util.Map<String, Object> response = new java.util.HashMap<>();
                response.put("fileId", fileId);
                response.put("headers", headers);
                logger.info("📥 [IMPORT UPLOAD] Archivo procesado correctamente. Columnas detectadas: {}", headers);
                return ResponseEntity.ok(response);
            } catch (IllegalArgumentException e) {
                logger.warn("⚠️ [IMPORT UPLOAD] Formato inválido: {}", e.getMessage());
                return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", e.getMessage()));
            } catch (Exception e) {
                logger.error("❌ [IMPORT UPLOAD] Error procesando archivo '{}': {}", file.getOriginalFilename(), e.getMessage(), e);
                return ResponseEntity.status(500).body(java.util.Collections.singletonMap("message",
                        "Error al procesar el archivo: " + e.getMessage()));
            }
        }

        @PostMapping("/import/preview")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<ImportPreviewResponse> getImportPreview(@RequestBody ImportSettingsRequest settings) throws IOException {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            ImportPreviewResponse preview = inventoryService.generatePreview(settings, userDetails.getCompanyId());
            return ResponseEntity.ok(preview);
        }

        @PostMapping("/import/execute")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> executeImport(@RequestBody ImportSettingsRequest settings) {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            inventoryService.executeImportAsync(settings, userDetails.getCompanyId());
            return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Importación iniciada en segundo plano."));
        }

        @GetMapping("/template")
        @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
        public ResponseEntity<Resource> getTemplate() throws IOException {
                ByteArrayInputStream in = inventoryService.generateCsvTemplate();

                HttpHeaders headers = new HttpHeaders();
                headers.add("Content-Disposition", "attachment; filename=formato_carga_inventario.csv");

                return ResponseEntity.ok()
                                .headers(headers)
                                .contentType(MediaType.parseMediaType("text/csv"))
                                .body(new InputStreamResource(in));
        }
}
