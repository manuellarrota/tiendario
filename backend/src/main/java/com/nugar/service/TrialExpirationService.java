package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.GlobalConfig;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.GlobalConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled service that checks for expired trial subscriptions
 * and move them to PAST_DUE automatically.
 */
@Service
public class TrialExpirationService {

    private static final Logger logger = LoggerFactory.getLogger(TrialExpirationService.class);

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private GlobalConfigRepository globalConfigRepository;

    /**
     * OBSOLETE: This service logic is now properly handled by ScheduledTasksService.checkExpiredSubscriptions()
     * which accurately respects the subscriptionEndDate of each company.
     * The scheduled annotations have been removed to prevent duplicate/faulty expiration logic.
     */
    // @Scheduled(cron = "0 0 2 * * *") 
    // @Scheduled(initialDelay = 60000, fixedDelay = Long.MAX_VALUE) 
    @Transactional
    public void checkExpiredTrials() {
        // No startup log - only log when something actually happens

        int trialDays = globalConfigRepository.findFirstByOrderByIdAsc()
                .map(GlobalConfig::getTrialDays)
                .orElse(30);

        List<Company> trialCompanies = companyRepository.findAll().stream()
                .filter(c -> SubscriptionStatus.TRIAL.equals(c.getSubscriptionStatus()))
                .filter(c -> c.getTrialStartDate() != null)
                .collect(java.util.stream.Collectors.toList());

        int expiredCount = 0;
        for (Company company : trialCompanies) {
            LocalDateTime expirationDate = company.getTrialStartDate().plusDays(trialDays);
            if (LocalDateTime.now().isAfter(expirationDate)) {
                company.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
                companyRepository.save(company);
                logger.warn("Trial expired for company '{}' (ID: {}). Status changed to PAST_DUE.",
                        company.getName(), company.getId());
                expiredCount++;
            }
        }

        // Also check PAID subscriptions past their end date
        List<Company> paidCompanies = companyRepository.findAll().stream()
                .filter(c -> SubscriptionStatus.PAID.equals(c.getSubscriptionStatus()))
                .filter(c -> c.getSubscriptionEndDate() != null)
                .filter(c -> LocalDateTime.now().isAfter(c.getSubscriptionEndDate()))
                .collect(java.util.stream.Collectors.toList());

        for (Company company : paidCompanies) {
            company.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
            companyRepository.save(company);
            logger.warn("Subscription expired for company '{}' (ID: {}). Status changed to PAST_DUE.",
                    company.getName(), company.getId());
            expiredCount++;
        }

        if (expiredCount > 0) {
            logger.info("[TRIAL EXPIRATION] {} subscriptions changed to PAST_DUE.", expiredCount);
        }
    }
}
