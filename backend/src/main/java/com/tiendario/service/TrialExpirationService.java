package com.tiendario.service;

import com.tiendario.domain.Company;
import com.tiendario.domain.GlobalConfig;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.GlobalConfigRepository;
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
 * and downgrades them to FREE automatically.
 */
@Service
public class TrialExpirationService {

    private static final Logger logger = LoggerFactory.getLogger(TrialExpirationService.class);

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private GlobalConfigRepository globalConfigRepository;

    /**
     * Runs every day at 2:00 AM to check for expired trials.
     * Also runs 60 seconds after startup for immediate verification.
     */
    @Scheduled(cron = "0 0 2 * * *") // Every day at 2 AM
    @Scheduled(initialDelay = 60000, fixedDelay = Long.MAX_VALUE) // Once at startup (after 60s)
    @Transactional
    public void checkExpiredTrials() {
        logger.info("Running trial expiration check...");

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
                company.setSubscriptionStatus(SubscriptionStatus.FREE);
                companyRepository.save(company);
                logger.warn("Trial expired for company '{}' (ID: {}). Downgraded to FREE.",
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

        logger.info("Trial expiration check complete. {} subscriptions updated.", expiredCount);
    }
}
