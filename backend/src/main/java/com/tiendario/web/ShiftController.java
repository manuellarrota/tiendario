package com.tiendario.web;

import com.tiendario.domain.Shift;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.ShiftService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    @Autowired
    private ShiftService shiftService;

    @GetMapping("/current")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<Shift> getCurrentShift() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Shift shift = shiftService.getCurrentShift(userDetails);
        if (shift == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(shift);
    }

    @PostMapping("/open")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<Shift> openShift(@RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        Object initialCashObj = payload.get("initialCash");
        BigDecimal initialCash = BigDecimal.ZERO;
        if (initialCashObj != null) {
            initialCash = new BigDecimal(initialCashObj.toString());
        }
        
        return ResponseEntity.ok(shiftService.openShift(initialCash, userDetails));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<Shift> closeShift(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        BigDecimal reportedCash = payload.get("reportedCash") != null ? new BigDecimal(payload.get("reportedCash").toString()) : BigDecimal.ZERO;
        BigDecimal reportedCard = payload.get("reportedCard") != null ? new BigDecimal(payload.get("reportedCard").toString()) : BigDecimal.ZERO;
        BigDecimal reportedTransfer = payload.get("reportedTransfer") != null ? new BigDecimal(payload.get("reportedTransfer").toString()) : BigDecimal.ZERO;
        BigDecimal reportedMobile = payload.get("reportedMobile") != null ? new BigDecimal(payload.get("reportedMobile").toString()) : BigDecimal.ZERO;
        String observation = (String) payload.get("observation");

        return ResponseEntity.ok(shiftService.closeShift(id, reportedCash, reportedCard, reportedTransfer, reportedMobile, observation, userDetails));
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Shift> verifyShift(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String observation = payload.get("observation");
        return ResponseEntity.ok(shiftService.verifyShift(id, observation, userDetails));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('MANAGER')")
    public List<Shift> getHistory() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return shiftService.getCompanyShifts(userDetails);
    }
}
