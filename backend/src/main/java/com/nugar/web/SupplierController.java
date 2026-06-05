package com.nugar.web;

import com.nugar.domain.Supplier;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.SupplierRepository;
import com.nugar.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.nugar.util.BusinessLogger;
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
                pageSuppliers = supplierRepository.findByCompanyIdAndSearch(userDetails.getCompanyId(), com.nugar.util.SearchUtils.normalize(q), paging);
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
            return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: El nombre del proveedor es obligatorio."));
        }

        if (supplier.getPhone() == null || supplier.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: El teléfono de contacto es obligatorio."));
        }

        if (supplier.getTaxId() != null && !supplier.getTaxId().trim().isEmpty()) {
            if (supplierRepository.existsByCompanyIdAndTaxId(userDetails.getCompanyId(), supplier.getTaxId())) {
                return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: Ya existe un proveedor registrado con este RIF/Identificación Fiscal."));
            }
        }

        supplier.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        Supplier savedSupplier = supplierRepository.save(supplier);

        BusinessLogger.log(log, "NUEVO_PROVEEDOR", data -> {
            data.put("registradoPor", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("proveedorId", savedSupplier.getId());
            data.put("nombre", savedSupplier.getName());
            if (savedSupplier.getTaxId() != null) data.put("rif", savedSupplier.getTaxId());
            data.put("telefono", savedSupplier.getPhone());
            if (savedSupplier.getEmail() != null) data.put("email", savedSupplier.getEmail());
            if (savedSupplier.getAddress() != null) data.put("direccion", savedSupplier.getAddress());
        });

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
            return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: El nombre del proveedor es obligatorio."));
        }

        if (supplierDetails.getPhone() == null || supplierDetails.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: El teléfono de contacto es obligatorio."));
        }

        // Check taxId uniqueness if changed
        if (supplierDetails.getTaxId() != null && !supplierDetails.getTaxId().equals(supplier.getTaxId())) {
            if (supplierRepository.existsByCompanyIdAndTaxId(userDetails.getCompanyId(), supplierDetails.getTaxId())) {
                return ResponseEntity.badRequest().body(new com.nugar.payload.response.MessageResponse("Error: Ya existe otro proveedor registrado con este RIF/Identificación Fiscal."));
            }
        }

        supplier.setName(supplierDetails.getName());
        supplier.setTaxId(supplierDetails.getTaxId());
        supplier.setEmail(supplierDetails.getEmail());
        supplier.setPhone(supplierDetails.getPhone());
        supplier.setAddress(supplierDetails.getAddress());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        BusinessLogger.log(log, "PROVEEDOR_ACTUALIZADO", data -> {
            data.put("modificadoPor", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("proveedorId", id);
            data.put("nombre", updatedSupplier.getName());
            if (updatedSupplier.getTaxId() != null) data.put("rif", updatedSupplier.getTaxId());
            data.put("telefono", updatedSupplier.getPhone());
            if (updatedSupplier.getEmail() != null) data.put("email", updatedSupplier.getEmail());
        });

        return ResponseEntity.ok(updatedSupplier);
    }
}
