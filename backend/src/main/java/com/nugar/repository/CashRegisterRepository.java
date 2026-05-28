package com.nugar.repository;

import com.nugar.domain.CashRegister;
import com.nugar.domain.CashRegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {
    List<CashRegister> findByCompanyIdAndStatus(Long companyId, CashRegisterStatus status);
    List<CashRegister> findByCompanyId(Long companyId);
    List<CashRegister> findByCompanyIdOrderByIdAsc(Long companyId);
    long countByCompanyId(Long companyId);
    Optional<CashRegister> findByIdAndCompanyId(Long id, Long companyId);
}
