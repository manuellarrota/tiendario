package com.tiendario.web;

import com.tiendario.domain.Supplier;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SupplierRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
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
                pageSuppliers = supplierRepository.findByCompanyIdAndSearch(userDetails.getCompanyId(), q.trim().toLowerCase(), paging);
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
    public ResponseEntity<Supplier> createSupplier(@RequestBody Supplier supplier) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        supplier.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        Supplier savedSupplier = supplierRepository.save(supplier);

        return ResponseEntity.ok(savedSupplier);
    }
}
