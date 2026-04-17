package com.tiendario.web;

import com.tiendario.domain.Sale;
import com.tiendario.payload.response.DailySalesSummary;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.SaleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    public Page<Sale> getCompanySales(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) com.tiendario.domain.SaleStatus status) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return saleService.getCompanySalesPaginated(userDetails, status, pageable);
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
        saleService.createSale(sale, userDetails);
        return ResponseEntity.ok(new MessageResponse("Order created successfully!"));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateSaleStatus(@PathVariable Long id,
            @RequestParam com.tiendario.domain.SaleStatus status,
            @RequestParam(required = false) com.tiendario.domain.PaymentMethod paymentMethod) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        saleService.updateSaleStatus(id, status, paymentMethod, userDetails);
        return ResponseEntity.ok(new MessageResponse("Sale status updated to " + status));
    }

    @GetMapping("/daily-summary")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<DailySalesSummary> getDailySalesSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return saleService.getDailySalesSummaryList(userDetails);
    }
}
