package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.domain.Sale;
import com.tiendario.domain.SaleItem;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/sales")
public class SaleController {

    @Autowired
    SaleRepository saleRepository;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Sale> getCompanySales() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return saleRepository.findByCompanyIdOrderByDateDesc(userDetails.getCompanyId());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createSale(@RequestBody Sale sale) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        if (userDetails.getCompanyId() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: User has no company assigned."));
        }

        var company = companyRepository.findById(userDetails.getCompanyId()).orElse(null);
        if (company == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Company not found."));
        }

        // Block sales for accounts without active subscription
        com.tiendario.domain.SubscriptionStatus subStatus = company.getSubscriptionStatus();
        if (com.tiendario.domain.SubscriptionStatus.FREE.equals(subStatus)) {
            return ResponseEntity.status(403)
                    .body(new MessageResponse(
                            "El plan GRATUITO no permite registrar ventas. Mejora a PREMIUM para acceder al sistema de ventas."));
        }
        if (com.tiendario.domain.SubscriptionStatus.PAST_DUE.equals(subStatus)) {
            return ResponseEntity.status(403)
                    .body(new MessageResponse(
                            "Tu suscripción ha vencido. Renueva tu plan para poder registrar ventas."));
        }
        if (com.tiendario.domain.SubscriptionStatus.SUSPENDED.equals(subStatus)) {
            return ResponseEntity.status(403)
                    .body(new MessageResponse(
                            "Tu cuenta está suspendida. Contacta al administrador para reactivarla."));
        }

        sale.setCompany(company);
        sale.setDate(LocalDateTime.now());
        sale.setStatus(com.tiendario.domain.SaleStatus.PAID);

        if (sale.getItems() == null || sale.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Sale must have at least one item."));
        }

        for (SaleItem item : sale.getItems()) {
            item.setSale(sale);

            if (item.getProduct() == null || item.getProduct().getId() == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Each item must have a product ID."));
            }

            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Check stock and availability
            if (product.getStock() < item.getQuantity()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Insufficient stock for " + product.getName()));
            }

            // Update Stock
            product.setStock(product.getStock() - item.getQuantity());
            productRepository.save(product);

            item.setProduct(product);
        }

        saleRepository.save(sale);

        return ResponseEntity.ok(new MessageResponse("Sale completed and stock updated!"));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateSaleStatus(@PathVariable Long id,
            @RequestParam com.tiendario.domain.SaleStatus status) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Sale sale = saleRepository.findById(id).orElse(null);
        if (sale == null || !sale.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Sale not found or access denied."));
        }

        sale.setStatus(status);
        saleRepository.save(sale);

        return ResponseEntity.ok(new MessageResponse("Sale status updated to " + status));
    }
}
