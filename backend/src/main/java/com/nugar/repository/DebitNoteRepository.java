package com.nugar.repository;

import com.nugar.domain.DebitNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DebitNoteRepository extends JpaRepository<DebitNote, Long> {
    List<DebitNote> findByCompanyIdOrderByDateDesc(Long companyId);
    Page<DebitNote> findByCompanyId(Long companyId, Pageable pageable);
    List<DebitNote> findByPurchaseIdOrderByDateDesc(Long purchaseId);
}
