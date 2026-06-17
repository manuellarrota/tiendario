package com.nugar.repository;

import com.nugar.domain.CreditNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditNoteRepository extends JpaRepository<CreditNote, Long> {
    List<CreditNote> findByCompanyIdOrderByDateDesc(Long companyId);
    Page<CreditNote> findByCompanyId(Long companyId, Pageable pageable);
    List<CreditNote> findBySaleId(Long saleId);
    List<CreditNote> findBySaleIdOrderByDateDesc(Long saleId);
    List<CreditNote> findByCustomerId(Long customerId);
}
