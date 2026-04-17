package com.tiendario.repository;

import com.tiendario.domain.Shift;
import com.tiendario.domain.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByUserIdAndStatus(Long userId, ShiftStatus status);
    List<Shift> findByCompanyIdOrderByStartTimeDesc(Long companyId);
    List<Shift> findByCompanyIdAndStatus(Long companyId, ShiftStatus status);
}
