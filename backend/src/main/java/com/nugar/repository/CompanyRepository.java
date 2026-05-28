package com.nugar.repository;

import com.nugar.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nugar.domain.SubscriptionStatus;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findBySubscriptionStatusInAndSubscriptionEndDateBefore(List<SubscriptionStatus> statuses,
            LocalDateTime date);
            
    List<Company> findBySubscriptionStatusAndSubscriptionEndDateBetween(SubscriptionStatus status, LocalDateTime start, LocalDateTime end);

    List<Company> findByLatitudeBetweenAndLongitudeBetween(double minLat, double maxLat, double minLon, double maxLon);

    java.util.Optional<Company> findByName(String name);
}
