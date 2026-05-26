package com.nugar.service;

import com.nugar.domain.*;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.SaleRepository;
import com.nugar.repository.ShiftRepository;
import com.nugar.repository.UserRepository;
import com.nugar.repository.CashRegisterRepository;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ShiftService {

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private CashRegisterRepository cashRegisterRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    public Shift getCurrentShift(UserDetailsImpl userDetails) {
        return shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN).orElse(null);
    }

    @Transactional
    public Shift openShift(Long cashRegisterId, BigDecimal initialCash, List<Map<String, Object>> rawOpeningDeclarations, UserDetailsImpl userDetails) {
        if (cashRegisterId == null) {
            throw new IllegalArgumentException("Debe seleccionar una caja para abrir el turno.");
        }

        CashRegister cashRegister = cashRegisterRepository.findByIdAndCompanyId(cashRegisterId, userDetails.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("La caja seleccionada no existe o no pertenece a esta tienda."));

        if (cashRegister.getStatus() == CashRegisterStatus.OPEN) {
            throw new IllegalArgumentException("La caja seleccionada ya está en uso por otro empleado.");
        }

        if (shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN).isPresent()) {
            throw new IllegalArgumentException("Ya tienes un turno de caja abierto.");
        }

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        Company company = companyRepository.findById(userDetails.getCompanyId()).orElseThrow();

        cashRegister.setStatus(CashRegisterStatus.OPEN);
        cashRegisterRepository.save(cashRegister);

        Shift shift = new Shift();
        shift.setUser(user);
        shift.setCompany(company);
        shift.setCashRegister(cashRegister);
        shift.setStartTime(LocalDateTime.now());
        shift.setStatus(ShiftStatus.OPEN);
        shift.setInitialCash(initialCash != null ? initialCash : BigDecimal.ZERO);
        shift.setDeclarations(new ArrayList<>());

        if (rawOpeningDeclarations != null && !rawOpeningDeclarations.isEmpty()) {
            BigDecimal totalInitialInBase = BigDecimal.ZERO;
            for (Map<String, Object> decMap : rawOpeningDeclarations) {
                ShiftDeclaration dec = new ShiftDeclaration();
                dec.setShift(shift);
                dec.setDeclarationType("OPENING");
                
                if (decMap.get("method") != null) {
                    dec.setMethod(PaymentMethod.valueOf(decMap.get("method").toString()));
                } else {
                    dec.setMethod(PaymentMethod.CASH);
                }
                dec.setCurrencyCode(decMap.get("currencyCode") != null ? decMap.get("currencyCode").toString() : "USD");
                dec.setDeclaredAmount(decMap.get("declaredAmount") != null ? new BigDecimal(decMap.get("declaredAmount").toString()) : BigDecimal.ZERO);
                
                if (decMap.get("exchangeRate") != null) {
                    dec.setExchangeRate(new BigDecimal(decMap.get("exchangeRate").toString()));
                }
                if (decMap.get("amountInBaseCurrency") != null) {
                    dec.setAmountInBaseCurrency(new BigDecimal(decMap.get("amountInBaseCurrency").toString()));
                } else if (dec.getExchangeRate() != null && dec.getExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                     dec.setAmountInBaseCurrency(dec.getDeclaredAmount().divide(dec.getExchangeRate(), 2, java.math.RoundingMode.HALF_UP));
                } else {
                     dec.setAmountInBaseCurrency(dec.getDeclaredAmount());
                }
                
                shift.getDeclarations().add(dec);
                totalInitialInBase = totalInitialInBase.add(dec.getAmountInBaseCurrency());
            }
            shift.setInitialCash(totalInitialInBase);
        }

        shift = shiftRepository.save(shift);
        
        StringBuilder details = new StringBuilder();
        if (shift.getDeclarations() != null && !shift.getDeclarations().isEmpty()) {
            shift.getDeclarations().stream()
                .filter(d -> "OPENING".equals(d.getDeclarationType()))
                .forEach(d -> details.append(String.format("[%s: %s] ", d.getCurrencyCode(), d.getDeclaredAmount())));
        } else {
            details.append("[Solo Base]");
        }
        
        log.info("[CAJA ABIERTA] Cajero: {} | Total Base Fija: ${} | Detalle: {} | Empresa: {}", 
            user.getUsername(), shift.getInitialCash(), details.toString().trim(), company.getName());

        return shift;
    }

    @Transactional
    public Shift closeShift(Long shiftId, BigDecimal reportedCash, BigDecimal reportedCard, 
                           BigDecimal reportedTransfer, BigDecimal reportedMobile, 
                           List<Map<String, Object>> rawDeclarations, String observation,
                           UserDetailsImpl userDetails) {
        
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Turno no encontrado."));

        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new IllegalArgumentException("El turno ya está cerrado o verificado.");
        }

        // Security check
        if (!shift.getUser().getId().equals(userDetails.getId())) {
             throw new IllegalArgumentException("No puedes cerrar un turno que no te pertenece.");
        }

        // Calculate expected values
        List<Sale> sales = saleRepository.findByShiftId(shiftId);
        
        BigDecimal expCash = BigDecimal.ZERO;
        BigDecimal expCard = BigDecimal.ZERO;
        BigDecimal expTransfer = BigDecimal.ZERO;
        BigDecimal expMobile = BigDecimal.ZERO;
        BigDecimal totalChange = BigDecimal.ZERO;

        for (Sale s : sales) {
            if (s.getStatus() == SaleStatus.PAID) {
                if (s.getPayments() == null || s.getPayments().isEmpty()) {
                    PaymentMethod method = s.getPaymentMethod() != null ? s.getPaymentMethod() : PaymentMethod.CASH;
                    BigDecimal amount = s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO;
                    switch (method) {
                        case CASH: expCash = expCash.add(amount); break;
                        case CARD: expCard = expCard.add(amount); break;
                        case TRANSFER: expTransfer = expTransfer.add(amount); break;
                        case MOBILE_PAYMENT: expMobile = expMobile.add(amount); break;
                    }
                } else {
                    for (SalePayment p : s.getPayments()) {
                        PaymentMethod method = p.getMethod() != null ? p.getMethod() : PaymentMethod.CASH;
                        BigDecimal amount = p.getAmountInBaseCurrency() != null ? p.getAmountInBaseCurrency() : (p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO);
                        
                        if (amount.compareTo(BigDecimal.ZERO) < 0 && method == PaymentMethod.CASH) {
                            totalChange = totalChange.add(amount.negate());
                        }

                        switch (method) {
                            case CASH: expCash = expCash.add(amount); break;
                            case CARD: expCard = expCard.add(amount); break;
                            case TRANSFER: expTransfer = expTransfer.add(amount); break;
                            case MOBILE_PAYMENT: expMobile = expMobile.add(amount); break;
                        }
                    }
                }
            }
        }

        shift.setExpectedCash(expCash.add(shift.getInitialCash()).subtract(shift.getRefundedCash() != null ? shift.getRefundedCash() : BigDecimal.ZERO));
        shift.setExpectedCard(expCard.subtract(shift.getRefundedCard() != null ? shift.getRefundedCard() : BigDecimal.ZERO));
        shift.setExpectedTransfer(expTransfer.subtract(shift.getRefundedTransfer() != null ? shift.getRefundedTransfer() : BigDecimal.ZERO));
        shift.setExpectedMobile(expMobile.subtract(shift.getRefundedMobile() != null ? shift.getRefundedMobile() : BigDecimal.ZERO));
        shift.setTotalChangeGiven(totalChange);

        shift.setReportedCash(reportedCash != null ? reportedCash : BigDecimal.ZERO);
        shift.setReportedCard(reportedCard != null ? reportedCard : BigDecimal.ZERO);
        shift.setReportedTransfer(reportedTransfer != null ? reportedTransfer : BigDecimal.ZERO);
        shift.setReportedMobile(reportedMobile != null ? reportedMobile : BigDecimal.ZERO);

        shift.setEndTime(LocalDateTime.now());
        shift.setStatus(ShiftStatus.CLOSED);
        shift.setObservation(observation);

        if (shift.getDeclarations() == null) {
            shift.setDeclarations(new ArrayList<>());
        }
        shift.getDeclarations().removeIf(d -> "CLOSING".equals(d.getDeclarationType()));

        StringBuilder closeDetails = new StringBuilder();
        BigDecimal calcReportedCash = BigDecimal.ZERO;
        BigDecimal calcReportedCard = BigDecimal.ZERO;
        BigDecimal calcReportedTransfer = BigDecimal.ZERO;
        BigDecimal calcReportedMobile = BigDecimal.ZERO;

        if (rawDeclarations != null) {
            for (Map<String, Object> decMap : rawDeclarations) {
                ShiftDeclaration dec = new ShiftDeclaration();
                dec.setShift(shift);
                if (decMap.get("method") != null) {
                    dec.setMethod(PaymentMethod.valueOf(decMap.get("method").toString()));
                } else {
                    dec.setMethod(PaymentMethod.CASH);
                }
                dec.setCurrencyCode(decMap.get("currencyCode") != null ? decMap.get("currencyCode").toString() : "USD");
                dec.setDeclaredAmount(decMap.get("declaredAmount") != null ? new BigDecimal(decMap.get("declaredAmount").toString()) : BigDecimal.ZERO);
                
                if (decMap.get("exchangeRate") != null) {
                    dec.setExchangeRate(new BigDecimal(decMap.get("exchangeRate").toString()));
                }
                if (decMap.get("amountInBaseCurrency") != null) {
                    dec.setAmountInBaseCurrency(new BigDecimal(decMap.get("amountInBaseCurrency").toString()));
                } else if (dec.getExchangeRate() != null && dec.getExchangeRate().compareTo(BigDecimal.ZERO) > 0) {
                     dec.setAmountInBaseCurrency(dec.getDeclaredAmount().divide(dec.getExchangeRate(), 2, java.math.RoundingMode.HALF_UP));
                } else {
                     dec.setAmountInBaseCurrency(dec.getDeclaredAmount()); // Fallback
                }
                
                dec.setDeclarationType("CLOSING");
                shift.getDeclarations().add(dec);
                closeDetails.append(String.format("[%s-%s: %s] ", dec.getMethod(), dec.getCurrencyCode(), dec.getDeclaredAmount()));

                switch (dec.getMethod()) {
                    case CASH: calcReportedCash = calcReportedCash.add(dec.getAmountInBaseCurrency()); break;
                    case CARD: calcReportedCard = calcReportedCard.add(dec.getAmountInBaseCurrency()); break;
                    case TRANSFER: calcReportedTransfer = calcReportedTransfer.add(dec.getAmountInBaseCurrency()); break;
                    case MOBILE_PAYMENT: calcReportedMobile = calcReportedMobile.add(dec.getAmountInBaseCurrency()); break;
                }
            }
        }

        shift.setReportedCash(reportedCash != null && reportedCash.compareTo(BigDecimal.ZERO) > 0 ? reportedCash : calcReportedCash);
        shift.setReportedCard(reportedCard != null && reportedCard.compareTo(BigDecimal.ZERO) > 0 ? reportedCard : calcReportedCard);
        shift.setReportedTransfer(reportedTransfer != null && reportedTransfer.compareTo(BigDecimal.ZERO) > 0 ? reportedTransfer : calcReportedTransfer);
        shift.setReportedMobile(reportedMobile != null && reportedMobile.compareTo(BigDecimal.ZERO) > 0 ? reportedMobile : calcReportedMobile);

        shift = shiftRepository.save(shift);

        if (shift.getCashRegister() != null) {
            CashRegister cr = shift.getCashRegister();
            cr.setStatus(CashRegisterStatus.CLOSED);
            cashRegisterRepository.save(cr);
        }

        BigDecimal diffCash = shift.getReportedCash().subtract(shift.getExpectedCash());
        String diffType = diffCash.compareTo(BigDecimal.ZERO) < 0 ? "FALTANTE" : (diffCash.compareTo(BigDecimal.ZERO) > 0 ? "SOBRANTE" : "CUADRE EXACTO");

        log.info("[CIERRE CAJA] Cajero: {} | Esperado EFECTIVO: ${} | Reportado: ${} | Diferencia: ${} ({}) | Detalle: {}", 
            shift.getUser().getUsername(), shift.getExpectedCash(), shift.getReportedCash(), diffCash, diffType, closeDetails.length() > 0 ? closeDetails.toString().trim() : "Sin declaraciones");

        return shift;
    }

    @Transactional
    public Shift verifyShift(Long shiftId, String observation, UserDetailsImpl userDetails) {
        Shift shift = shiftRepository.findById(shiftId).orElseThrow();
        
        // Security check - Only Manager or Admin
        if (!userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new IllegalArgumentException("Solo un administrador puede verificar los turnos.");
        }

        shift.setStatus(ShiftStatus.VERIFIED);
        if (observation != null && !observation.isEmpty()) {
            shift.setObservation((shift.getObservation() != null ? shift.getObservation() + "\n" : "") + "Verificación: " + observation);
        }

        return shiftRepository.save(shift);
    }

    public List<Shift> getCompanyShifts(UserDetailsImpl userDetails) {
        return shiftRepository.findByCompanyIdOrderByStartTimeDesc(userDetails.getCompanyId());
    }
}
