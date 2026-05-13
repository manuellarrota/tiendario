package com.tiendario.web;

import com.tiendario.domain.Supplier;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SupplierRepository;
import com.tiendario.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private static final Logger log = LoggerFactory.getLogger(SupplierController.class);
    @Autowired
    SupplierRepository supplierRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> getSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort,
            @RequestParam(required = false) String q) {

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        try {
            org.springframework.data.domain.Sort.Order order = new org.springframework.data.domain.Sort.Order(
                    org.springframework.data.domain.Sort.Direction.fromString(sort[1]), sort[0]);
            org.springframework.data.domain.Pageable paging = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(order));

            org.springframework.data.domain.Page<Supplier> pageSuppliers;
            if (q != null && !q.trim().isEmpty()) {
                pageSuppliers = supplierRepository.findByCompanyIdAndSearch(userDetails.getCompanyId(), com.tiendario.util.SearchUtils.normalize(q), paging);
            } else {
                pageSuppliers = supplierRepository.findByCompanyId(userDetails.getCompanyId(), paging);
            }

            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("suppliers", pageSuppliers.getContent());
            response.put("currentPage", pageSuppliers.getNumber());
            response.put("totalItems", pageSuppliers.getTotalElements());
            response.put("totalPages", pageSuppliers.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createSupplier(@RequestBody Supplier supplier) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        if (supplier.getName() == null || supplier.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: El nombre del proveedor es obligatorio."));
        }

        if (supplier.getPhone() == null || supplier.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: El teléfono de contacto es obligatorio."));
        }

        if (supplier.getTaxId() != null && !supplier.getTaxId().trim().isEmpty()) {
            if (supplierRepository.existsByCompanyIdAndTaxId(userDetails.getCompanyId(), supplier.getTaxId())) {
                return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: Ya existe un proveedor registrado con este RIF/Identificación Fiscal."));
            }
        }

        supplier.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        Supplier savedSupplier = supplierRepository.save(supplier);

        log.info("[NUEVO PROVEEDOR] Registrado por: {} | Nombre: {} | RIF/TaxId: {} | Telefono: {} | Email: {} | Empresa ID: {}",
            userDetails.getUsername(), savedSupplier.getName(), savedSupplier.getTaxId(),
            savedSupplier.getPhone(), savedSupplier.getEmail(), userDetails.getCompanyId());

        return ResponseEntity.ok(savedSupplier);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateSupplier(@PathVariable Long id, @RequestBody Supplier supplierDetails) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Supplier supplier = supplierRepository.findById(id).orElse(null);
        if (supplier == null || !supplier.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.notFound().build();
        }

        if (supplierDetails.getName() == null || supplierDetails.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: El nombre del proveedor es obligatorio."));
        }

        if (supplierDetails.getPhone() == null || supplierDetails.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: El teléfono de contacto es obligatorio."));
        }

        // Check taxId uniqueness if changed
        if (supplierDetails.getTaxId() != null && !supplierDetails.getTaxId().equals(supplier.getTaxId())) {
            if (supplierRepository.existsByCompanyIdAndTaxId(userDetails.getCompanyId(), supplierDetails.getTaxId())) {
                return ResponseEntity.badRequest().body(new com.tiendario.payload.response.MessageResponse("Error: Ya existe otro proveedor registrado con este RIF/Identificación Fiscal."));
            }
        }

        supplier.setName(supplierDetails.getName());
        supplier.setTaxId(supplierDetails.getTaxId());
        supplier.setEmail(supplierDetails.getEmail());
        supplier.setPhone(supplierDetails.getPhone());
        supplier.setAddress(supplierDetails.getAddress());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        log.info("[PROVEEDOR ACTUALIZADO] ID: {} | Por: {} | Nombre: {} | Empresa ID: {}", 
            id, userDetails.getUsername(), updatedSupplier.getName(), userDetails.getCompanyId());

        return ResponseEntity.ok(updatedSupplier);
    }
}
