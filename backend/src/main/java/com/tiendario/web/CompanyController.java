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

        @PutMapping("/profile")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> updateCompanyProfile(@RequestBody Company profileUpdate) {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();

                Company company = companyRepository.findById(userDetails.getCompanyId())
                                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

                // Update allowed fields only
                if (profileUpdate.getName() != null && !profileUpdate.getName().isBlank()) {
                        company.setName(profileUpdate.getName());
                }
                if (profileUpdate.getDescription() != null) {
                        company.setDescription(profileUpdate.getDescription());
                }
                if (profileUpdate.getPhoneNumber() != null) {
                        company.setPhoneNumber(profileUpdate.getPhoneNumber());
                }
                if (profileUpdate.getImageUrl() != null) {
                        company.setImageUrl(profileUpdate.getImageUrl());
                }
                if (profileUpdate.getLatitude() != null) {
                        company.setLatitude(profileUpdate.getLatitude());
                }
                if (profileUpdate.getLongitude() != null) {
                        company.setLongitude(profileUpdate.getLongitude());
                }
                if (profileUpdate.getBaseCurrency() != null && !profileUpdate.getBaseCurrency().isBlank()) {
                        company.setBaseCurrency(profileUpdate.getBaseCurrency());
                }
                if (profileUpdate.getTimezone() != null && !profileUpdate.getTimezone().isBlank()) {
                        company.setTimezone(profileUpdate.getTimezone());
                }

                companyRepository.save(company);
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

                company.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
                companyRepository.save(company);

                // TRIGGER RE-INDEXING
                productIndexService.reindexCompanyProducts(company.getId());

                return ResponseEntity.ok(new MessageResponse("Subscription downgraded to PAST_DUE (Vencida)."));
        }
}
