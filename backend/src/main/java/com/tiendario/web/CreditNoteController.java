package com.tiendario.web;

import com.tiendario.domain.CreditNote;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.CreditNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/credit-notes")
public class CreditNoteController {

    @Autowired
    private CreditNoteService creditNoteService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<CreditNote> getCompanyCreditNotes() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return creditNoteService.getCompanyCreditNotes(userDetails);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public ResponseEntity<?> createCreditNote(@RequestBody CreditNoteRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        CreditNote creditNote = creditNoteService.createCreditNote(
                request.getSaleId(),
                request.getAmount(),
                request.getReason(),
                request.getType(),
                userDetails
        );
        return ResponseEntity.ok(creditNote);
    }

    public static class CreditNoteRequest {
        private Long saleId;
        private BigDecimal amount;
        private String reason;
        private CreditNote.CreditNoteType type;

        public Long getSaleId() { return saleId; }
        public void setSaleId(Long saleId) { this.saleId = saleId; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public CreditNote.CreditNoteType getType() { return type; }
        public void setType(CreditNote.CreditNoteType type) { this.type = type; }
    }
}
