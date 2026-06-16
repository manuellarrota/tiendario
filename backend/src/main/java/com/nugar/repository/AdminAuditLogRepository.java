package com.nugar.repository;

import com.nugar.domain.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    Page<AdminAuditLog> findByCompanyIdOrderByTimestampDesc(Long companyId, Pageable pageable);

    List<AdminAuditLog> findByCompanyIdAndEntityTypeOrderByTimestampDesc(Long companyId, String entityType);
}
