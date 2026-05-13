package com.tiendario.service;

import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SaleRepository;
import com.tiendario.repository.ShiftRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ShiftService {

    @Autowired
    private ShiftRepository shiftRepository;

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
    public Shift openShift(BigDecimal initialCash, UserDetailsImpl userDetails) {
        if (shiftRepository.findByUserIdAndStatus(userDetails.getId(), ShiftStatus.OPEN).isPresent()) {
            throw new RuntimeException("Ya tienes un turno de caja abierto.");
        }

        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        Company company = companyRepository.findById(userDetails.getCompanyId()).orElseThrow();

        Shift shift = new Shift();
        shift.setUser(user);
        shift.setCompany(company);
        shift.setStartTime(LocalDateTime.now());
        shift.setStatus(ShiftStatus.OPEN);
        shift.setInitialCash(initialCash != null ? initialCash : BigDecimal.ZERO);

        shift = shiftRepository.save(shift);
        
        log.info("[CAJA ABIERTA] Cajero: {} | Base Fija Inicial: ${} | Empresa: {}", 
            user.getUsername(), shift.getInitialCash(), company.getName());

        return shift;
    }

    @Transactional
    public Shift closeShift(Long shiftId, BigDecimal reportedCash, BigDecimal reportedCard, 
                           BigDecimal reportedTransfer, BigDecimal reportedMobile, String observation,
                           UserDetailsImpl userDetails) {
        
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new RuntimeException("Turno no encontrado."));

        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new RuntimeException("El turno ya está cerrado o verificado.");
        }

        // Security check
        if (!shift.getUser().getId().equals(userDetails.getId())) {
             throw new RuntimeException("No puedes cerrar un turno que no te pertenece.");
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

        shift = shiftRepository.save(shift);

        BigDecimal diffCash = shift.getReportedCash().subtract(shift.getExpectedCash());
        String diffType = diffCash.compareTo(BigDecimal.ZERO) < 0 ? "FALTANTE" : (diffCash.compareTo(BigDecimal.ZERO) > 0 ? "SOBRANTE" : "CUADRE EXACTO");

        log.info("[CIERRE CAJA] Cajero: {} | Esperado EFECTIVO: ${} | Reportado: ${} | Diferencia: ${} ({}) | Vueltos dados: ${}", 
            shift.getUser().getUsername(), shift.getExpectedCash(), shift.getReportedCash(), diffCash, diffType, shift.getTotalChangeGiven());

        return shift;
    }

    @Transactional
    public Shift verifyShift(Long shiftId, String observation, UserDetailsImpl userDetails) {
        Shift shift = shiftRepository.findById(shiftId).orElseThrow();
        
        // Security check - Only Manager or Admin
        if (!userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new RuntimeException("Solo un administrador puede verificar los turnos.");
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
