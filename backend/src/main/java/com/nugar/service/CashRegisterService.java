package com.nugar.service;

import com.nugar.domain.CashRegister;
import com.nugar.domain.CashRegisterStatus;
import com.nugar.domain.Company;
import com.nugar.repository.CashRegisterRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;

@Slf4j
@Service
public class CashRegisterService {

    @Autowired
    private CashRegisterRepository cashRegisterRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("ALTER TABLE cash_registers DROP CONSTRAINT IF EXISTS cash_registers_status_check");
            log.info("[CAJA_REGISTRADORA] Dropped legacy cash_registers_status_check constraint to allow SUSPENDED status");
        } catch (Exception e) {
            log.debug("Check constraint does not exist or could not be dropped", e);
        }
    }

    @Transactional
    public void provisionRegistersForCompany(Company company) {
        int defaultLimit = company.getSubscriptionPlan() != null ? company.getSubscriptionPlan().getDefaultRegisterLimit() : 1;
        int extraLimit = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
        int totalAllowed = defaultLimit + extraLimit;

        List<CashRegister> allRegisters = cashRegisterRepository.findByCompanyIdOrderByIdAsc(company.getId());
        int currentCount = allRegisters.size();

        log.info("[CAJA_REGISTRADORA] Provisioning cash registers for company {} (Total allowed: {}, Current: {})", 
                 company.getName(), totalAllowed, currentCount);

        // Reactivate or Suspend existing registers based on totalAllowed
        for (int i = 0; i < currentCount; i++) {
            CashRegister register = allRegisters.get(i);
            if (i < totalAllowed) {
                // Should be active
                if (CashRegisterStatus.SUSPENDED.equals(register.getStatus())) {
                    register.setStatus(CashRegisterStatus.CLOSED);
                    cashRegisterRepository.save(register);
                }
            } else {
                // Exceeds limit, should be suspended
                if (!CashRegisterStatus.SUSPENDED.equals(register.getStatus())) {
                    register.setStatus(CashRegisterStatus.SUSPENDED);
                    cashRegisterRepository.save(register);
                }
            }
        }

        // If we still need more registers to meet the totalAllowed
        if (currentCount < totalAllowed) {
            long registersToCreate = totalAllowed - currentCount;
            log.info("[CAJA_REGISTRADORA] Creating {} new cash registers for company {}", registersToCreate, company.getName());

            for (int i = 0; i < registersToCreate; i++) {
                CashRegister register = new CashRegister();
                register.setCompany(company);
                register.setName("Caja " + (currentCount + i + 1));
                register.setStatus(CashRegisterStatus.CLOSED);
                cashRegisterRepository.save(register);
            }
        }
    }

    public List<CashRegister> getAvailableRegisters(Long companyId) {
        return cashRegisterRepository.findByCompanyIdAndStatus(companyId, CashRegisterStatus.CLOSED);
    }
}
