package com.nugar.web;

import com.nugar.domain.CashRegister;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.CashRegisterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/cash-registers")
public class CashRegisterController {

    @Autowired
    private CashRegisterService cashRegisterService;

    @GetMapping("/available")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<List<CashRegister>> getAvailableRegisters() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<CashRegister> availableRegisters = cashRegisterService.getAvailableRegisters(userDetails.getCompanyId());
        return ResponseEntity.ok(availableRegisters);
    }
}
