package com.nugar.web;

import com.nugar.domain.Company;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CompanyRepository;
import com.nugar.security.UserDetailsImpl;
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

        @Autowired
        com.nugar.service.CashRegisterService cashRegisterService;

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
                if (profileUpdate.getRif() != null && !profileUpdate.getRif().isBlank()) {
                        company.setRif(profileUpdate.getRif());
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

        @PostMapping("/add-registers")
        @PreAuthorize("hasRole('MANAGER')")
        public ResponseEntity<?> addExtraRegisters(@RequestBody java.util.Map<String, Integer> payload) {
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                                .getPrincipal();

                Company company = companyRepository.findById(userDetails.getCompanyId())
                                .orElseThrow(() -> new RuntimeException("Error: Company not found."));

                // User passes the EXACT number of extra registers they want to have
                int requestedTotal = payload.getOrDefault("requested", 0);
                if (requestedTotal < 0) requestedTotal = 0;

                int currentBilled = company.getBilledExtraRegisters() != null ? company.getBilledExtraRegisters() : 0;
                int currentExtra = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;

                // Track max boxes used during cycle
                company.setBilledExtraRegisters(Math.max(currentBilled, Math.max(currentExtra, requestedTotal)));
                
                String message = "Cajas actualizadas exitosamente.";

                if (requestedTotal < currentExtra) {
                        company.setNextCycleExtraRegisters(requestedTotal);
                        message = "La reducción de cajas se aplicará a partir de tu próximo ciclo de facturación.";
                } else {
                        company.setExtraRegisters(requestedTotal);
                        company.setNextCycleExtraRegisters(null);
                        cashRegisterService.provisionRegistersForCompany(company);
                }

                companyRepository.save(company);

                return ResponseEntity.ok(new MessageResponse(message));
        }

        @Autowired
        com.nugar.service.ProductIndexService productIndexService;

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
