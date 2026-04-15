package com.tiendario.web;

import com.tiendario.domain.Sale;
import com.tiendario.payload.response.DailySalesSummary;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.SaleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private static final Logger logger = LoggerFactory.getLogger(SaleController.class);
    private final SaleService saleService;

    @Autowired
    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Sale> getCompanySales() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return saleService.getCompanySales(userDetails);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public Sale getSaleById(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return saleService.getSaleById(id, userDetails);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createSale(@RequestBody Sale sale) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        try {
            logger.info("User {} is creating a new sale for amount: {}", userDetails.getUsername(), sale.getTotalAmount());
            saleService.createSale(sale, userDetails);
            logger.info("Sale created successfully for user {}", userDetails.getUsername());
            return ResponseEntity.ok(new MessageResponse("Order created successfully!"));
        } catch (RuntimeException e) {
            logger.error("Error creating sale for user {}: {}", userDetails.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateSaleStatus(@PathVariable Long id,
            @RequestParam com.tiendario.domain.SaleStatus status,
            @RequestParam(required = false) com.tiendario.domain.PaymentMethod paymentMethod) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        try {
            logger.info("User {} updating sale {} to status: {}", userDetails.getUsername(), id, status);
            saleService.updateSaleStatus(id, status, paymentMethod, userDetails);
            logger.info("Sale {} status updated successfully", id);
            return ResponseEntity.ok(new MessageResponse("Sale status updated to " + status));
        } catch (RuntimeException e) {
            logger.error("Error updating sale status for user {}: {}", userDetails.getUsername(), e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/daily-summary")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<DailySalesSummary> getDailySalesSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return saleService.getDailySalesSummaryList(userDetails);
    }
}
