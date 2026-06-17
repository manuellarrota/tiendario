package com.nugar.web;

import com.nugar.domain.DebitNote;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.DebitNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/debit-notes")
public class DebitNoteController {

    @Autowired
    private DebitNoteService debitNoteService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<DebitNote> getCompanyDebitNotes() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return debitNoteService.getCompanyDebitNotes(userDetails);
    }

    @GetMapping("/by-purchase/{purchaseId}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<DebitNote> getDebitNotesByPurchase(@PathVariable Long purchaseId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return debitNoteService.getDebitNotesByPurchase(purchaseId, userDetails);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> createDebitNote(@RequestBody DebitNoteRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        DebitNote debitNote = debitNoteService.createDebitNote(
                request.getPurchaseId(),
                request.getReason(),
                request.getItems(),
                userDetails
        );
        return ResponseEntity.ok(debitNote);
    }

    public static class DebitNoteRequest {
        private Long purchaseId;
        private String reason;
        private List<DebitNoteService.DebitNoteItemRequest> items;

        public Long getPurchaseId() { return purchaseId; }
        public void setPurchaseId(Long purchaseId) { this.purchaseId = purchaseId; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public List<DebitNoteService.DebitNoteItemRequest> getItems() { return items; }
        public void setItems(List<DebitNoteService.DebitNoteItemRequest> items) { this.items = items; }
    }
}
