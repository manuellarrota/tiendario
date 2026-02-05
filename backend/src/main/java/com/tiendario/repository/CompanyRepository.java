package com.tiendario.repository;

import com.tiendario.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tiendario.domain.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findBySubscriptionStatusInAndSubscriptionEndDateBefore(List<SubscriptionStatus> statuses,
            LocalDateTime date);
}
