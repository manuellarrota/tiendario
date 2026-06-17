package com.nugar.web;

import com.nugar.domain.Shift;
import com.nugar.payload.response.MessageResponse;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.ShiftService;
import com.nugar.util.BusinessLogger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private static final Logger log = LoggerFactory.getLogger(ShiftController.class);

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
        
        Object cashRegisterIdObj = payload.get("cashRegisterId");
        Long cashRegisterId = null;
        if (cashRegisterIdObj != null) {
            cashRegisterId = Long.valueOf(cashRegisterIdObj.toString());
        }

        Object initialCashObj = payload.get("initialCash");
        BigDecimal initialCash = BigDecimal.ZERO;
        if (initialCashObj != null) {
            initialCash = new BigDecimal(initialCashObj.toString());
        }
        
        List<Map<String, Object>> openingDeclarations = null;
        if (payload.get("openingDeclarations") != null) {
            openingDeclarations = (List<Map<String, Object>>) payload.get("openingDeclarations");
        }
        
        Shift openedShift = shiftService.openShift(cashRegisterId, initialCash, openingDeclarations, userDetails);
        final List<Map<String, Object>> finalDeclarations = openingDeclarations;
        final BigDecimal finalInitialCash = initialCash;
        BusinessLogger.log(log, "TURNO_ABIERTO", data -> {
            data.put("cajero", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("turnoId", openedShift.getId());
            data.put("caja", openedShift.getCashRegister() != null ? openedShift.getCashRegister().getName() : "Sin caja");
            Map<String, Object> montoInicial = new LinkedHashMap<>();
            if (finalDeclarations != null && !finalDeclarations.isEmpty()) {
                finalDeclarations.forEach(d -> {
                    String currency = d.get("currencyCode") != null ? d.get("currencyCode").toString() : "USD";
                    Object amount = d.get("declaredAmount") != null ? d.get("declaredAmount") : 0;
                    montoInicial.put(currency, amount);
                });
            } else {
                montoInicial.put("USD", finalInitialCash);
            }
            data.put("montoInicial", montoInicial);
        });
        return ResponseEntity.ok(openedShift);
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
        List<Map<String, Object>> declarations = (List<Map<String, Object>>) payload.get("declarations");

        Shift closedShift = shiftService.closeShift(id, reportedCash, reportedCard, reportedTransfer, reportedMobile, declarations, observation, userDetails);
        final List<Map<String, Object>> finalDeclarations2 = declarations;
        BusinessLogger.log(log, "TURNO_CERRADO", data -> {
            data.put("cajero", userDetails.getUsername());
            data.put("empresaId", userDetails.getCompanyId());
            data.put("turnoId", id);
            data.put("caja", closedShift.getCashRegister() != null ? closedShift.getCashRegister().getName() : "Sin caja");
            Map<String, Object> reportado = new LinkedHashMap<>();
            if (finalDeclarations2 != null && !finalDeclarations2.isEmpty()) {
                finalDeclarations2.forEach(d -> {
                    String currency = d.get("currencyCode") != null ? d.get("currencyCode").toString() : "USD";
                    String method = d.get("method") != null ? d.get("method").toString() : "CASH";
                    Object amount = d.get("declaredAmount") != null ? d.get("declaredAmount") : 0;
                    reportado.put(currency + "_" + method, amount);
                });
            } else {
                reportado.put("USD_CASH", reportedCash);
            }
            data.put("montoDeclarado", reportado);
            if (closedShift.getObservation() != null && !closedShift.getObservation().isBlank()) {
                data.put("observacion", closedShift.getObservation());
            }
        });
        return ResponseEntity.ok(closedShift);
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Shift> verifyShift(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String observation = payload.get("observation") != null ? payload.get("observation").toString() : null;
        boolean hasIssues = payload.get("hasIssues") != null && Boolean.parseBoolean(payload.get("hasIssues").toString());
        return ResponseEntity.ok(shiftService.verifyShift(id, observation, hasIssues, userDetails));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('MANAGER')")
    public List<Shift> getHistory() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return shiftService.getCompanyShifts(userDetails);
    }

    @PostMapping("/{id}/movement")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<?> registerMovement(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        com.nugar.domain.CashMovement.MovementType type = com.nugar.domain.CashMovement.MovementType.valueOf(payload.get("type").toString());
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String currencyCode = payload.get("currencyCode") != null ? payload.get("currencyCode").toString() : "USD";
        BigDecimal exchangeRate = payload.get("exchangeRate") != null ? new BigDecimal(payload.get("exchangeRate").toString()) : BigDecimal.ONE;
        String description = payload.get("description") != null ? payload.get("description").toString() : "";

        com.nugar.domain.CashMovement movement = shiftService.registerCashMovement(id, type, amount, currencyCode, exchangeRate, description, userDetails);
        return ResponseEntity.ok(movement);
    }

    @PostMapping("/{id}/transfer")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<?> transferCash(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        Long toCashRegisterId = Long.valueOf(payload.get("toCashRegisterId").toString());
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String currencyCode = payload.get("currencyCode") != null ? payload.get("currencyCode").toString() : "USD";
        BigDecimal exchangeRate = payload.get("exchangeRate") != null ? new BigDecimal(payload.get("exchangeRate").toString()) : BigDecimal.ONE;
        String description = payload.get("description") != null ? payload.get("description").toString() : "";

        shiftService.transferCash(id, toCashRegisterId, amount, currencyCode, exchangeRate, description, userDetails);
        return ResponseEntity.ok(new MessageResponse("Transferencia completada correctamente."));
    }
}
