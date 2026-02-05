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

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
    @Autowired
    SupplierRepository supplierRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Supplier> getSuppliers() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return supplierRepository.findByCompanyId(userDetails.getCompanyId());
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
