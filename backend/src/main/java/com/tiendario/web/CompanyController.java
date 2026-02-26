package com.tiendario.web;

import com.tiendario.domain.Company;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company")
public class CompanyController {

        @Autowired
        CompanyRepository companyRepository;

        @GetMapping("/profile")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> getCompanyProfile() {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();

                Company company = companyRepository.findById(userDetails.getCompanyId())
                                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

                return ResponseEntity.ok(company);
        }

        @Autowired
        com.tiendario.service.ProductIndexService productIndexService;

        @PostMapping("/subscribe")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> upgradeSubscription() {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();

                Company company = companyRepository.findById(userDetails.getCompanyId())
                                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

                company.setSubscriptionStatus(SubscriptionStatus.PAID);
                companyRepository.save(company);

                // TRIGGER RE-INDEXING
                productIndexService.reindexCompanyProducts(company.getId());

                return ResponseEntity.ok(new MessageResponse("Subscription upgraded to PAID!"));
        }

        @PostMapping("/unsubscribe")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> downgradeSubscription() {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();

                Company company = companyRepository.findById(userDetails.getCompanyId())
                                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

                company.setSubscriptionStatus(SubscriptionStatus.FREE);
                companyRepository.save(company);

                // TRIGGER RE-INDEXING
                productIndexService.reindexCompanyProducts(company.getId());

                return ResponseEntity.ok(new MessageResponse("Subscription downgraded to FREE."));
        }
}
