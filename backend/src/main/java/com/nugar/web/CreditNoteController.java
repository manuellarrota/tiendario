package com.nugar.web;

import com.nugar.domain.CreditNote;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.CreditNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/by-sale/{saleId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public List<CreditNote> getCreditNotesBySale(@PathVariable Long saleId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return creditNoteService.getCreditNotesBySale(saleId, userDetails);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public ResponseEntity<?> createCreditNote(@RequestBody CreditNoteRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        CreditNote creditNote = creditNoteService.createCreditNote(
                request.getSaleId(),
                request.getReason(),
                request.getType(),
                request.getItems(),
                userDetails
        );
        return ResponseEntity.ok(creditNote);
    }

    public static class CreditNoteRequest {
        private Long saleId;
        private String reason;
        private CreditNote.CreditNoteType type;
        private List<CreditNoteService.CreditNoteItemRequest> items;

        public Long getSaleId() { return saleId; }
        public void setSaleId(Long saleId) { this.saleId = saleId; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public CreditNote.CreditNoteType getType() { return type; }
        public void setType(CreditNote.CreditNoteType type) { this.type = type; }
        public List<CreditNoteService.CreditNoteItemRequest> getItems() { return items; }
        public void setItems(List<CreditNoteService.CreditNoteItemRequest> items) { this.items = items; }
    }
}
