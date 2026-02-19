package com.tiendario.service;

import com.tiendario.domain.Company;
import com.tiendario.domain.Role;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.domain.User;
import com.tiendario.payload.request.SignupRequest;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

    @Autowired
    public AuthService(UserRepository userRepository,
            CompanyRepository companyRepository,
            PasswordEncoder encoder,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.encoder = encoder;
        this.emailService = emailService;
    }

    @Transactional
    public User registerUser(SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new RuntimeException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        // Create new user's account
        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        user.setEmail(signUpRequest.getEmail());
        user.setEnabled(false); // Creating inactive user
        user.setVerificationCode(java.util.UUID.randomUUID().toString());

        Set<String> strRoles = signUpRequest.getRole();
        String roleStr = (strRoles != null && !strRoles.isEmpty()) ? strRoles.iterator().next() : "client";

        // Prevent Super Admin creation via public API
        if ("admin".equalsIgnoreCase(roleStr)) {
            throw new RuntimeException("Error: Super Admin registration is not allowed via public API.");
        }

        if ("manager".equalsIgnoreCase(roleStr)) {
            // Manager ALWAYS needs a Company
            if (signUpRequest.getCompanyName() == null || signUpRequest.getCompanyName().isEmpty()) {
                throw new RuntimeException("Error: Company Name is required for Managers.");
            }
            user.setRole(Role.ROLE_MANAGER);

            // Create Company
            Company company = new Company();
            company.setName(signUpRequest.getCompanyName());
            company.setSubscriptionStatus(SubscriptionStatus.FREE);
            // Default location if missing (or could be 0.0)
            company.setLatitude(signUpRequest.getLatitude() != null ? signUpRequest.getLatitude() : 0.0);
            company.setLongitude(signUpRequest.getLongitude() != null ? signUpRequest.getLongitude() : 0.0);

            // Set Phone Number if provided
            if (signUpRequest.getPhoneNumber() != null) {
                company.setPhoneNumber(signUpRequest.getPhoneNumber());
            }

            companyRepository.save(company);
            user.setCompany(company);
        } else {
            // Default to Client
            user.setRole(Role.ROLE_CLIENT);
            user.setEnabled(true);
        }

        userRepository.save(user);

        if (!user.isEnabled()) {
            emailService.sendVerificationEmail(user.getEmail(), user.getVerificationCode());
        }

        return user;
    }
}
