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

@Slf4j
@Service
public class CashRegisterService {

    @Autowired
    private CashRegisterRepository cashRegisterRepository;

    @Transactional
    public void provisionRegistersForCompany(Company company) {
        int defaultLimit = company.getSubscriptionPlan() != null ? company.getSubscriptionPlan().getDefaultRegisterLimit() : 1;
        int extraLimit = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
        int totalAllowed = defaultLimit + extraLimit;

        long currentCount = cashRegisterRepository.countByCompanyId(company.getId());

        if (currentCount < totalAllowed) {
            long registersToCreate = totalAllowed - currentCount;
            log.info("Provisioning {} new cash registers for company {} (Total allowed: {})", registersToCreate, company.getName(), totalAllowed);

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
