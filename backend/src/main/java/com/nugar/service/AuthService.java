package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.Role;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.domain.User;
import com.nugar.payload.request.SignupRequest;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nugar.repository.CustomerRepository;
import com.nugar.domain.Customer;
import java.util.List;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

    @Autowired
    public AuthService(UserRepository userRepository,
            CompanyRepository companyRepository,
            CustomerRepository customerRepository,
            PasswordEncoder encoder,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.customerRepository = customerRepository;
        this.encoder = encoder;
        this.emailService = emailService;
    }

    @Transactional
    public User registerUser(SignupRequest signUpRequest, String customBackendUrl) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new RuntimeException("Error: ¡El nombre de usuario ya está en uso!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new RuntimeException("Error: ¡El correo electrónico ya está en uso!");
        }

        // Create new user's account
        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        user.setEmail(signUpRequest.getEmail());
        user.setEnabled(false); // Creating inactive user
        user.setVerificationCode(java.util.UUID.randomUUID().toString());

        // Profile fields
        user.setFullName(signUpRequest.getFullName());
        user.setCedula(signUpRequest.getCedula());
        user.setPhone(signUpRequest.getPhoneNumber());
        user.setAddress(signUpRequest.getAddress());

        Set<String> strRoles = signUpRequest.getRole();
        String roleStr = (strRoles != null && !strRoles.isEmpty()) ? strRoles.iterator().next() : "client";

        // Prevent Super Admin creation via public API
        if ("admin".equalsIgnoreCase(roleStr)) {
            throw new RuntimeException(
                    "Error: El registro de Super Administrador no está permitido a través de la API pública.");
        }

        if ("manager".equalsIgnoreCase(roleStr)) {
            // Manager ALWAYS needs a Company
            if (signUpRequest.getCompanyName() == null || signUpRequest.getCompanyName().isEmpty()) {
                throw new RuntimeException("Error: El nombre de la empresa es obligatorio.");
            }
            user.setRole(Role.ROLE_MANAGER);

            // Create Company
            Company company = new Company();
            company.setName(signUpRequest.getCompanyName());
            company.setSubscriptionStatus(SubscriptionStatus.TRIAL);
            company.setTrialStartDate(java.time.LocalDateTime.now());
            company.setSubscriptionEndDate(java.time.LocalDateTime.now().plusDays(15));
            // Default location if missing (or could be 0.0)
            company.setLatitude(signUpRequest.getLatitude() != null ? signUpRequest.getLatitude() : 0.0);
            company.setLongitude(signUpRequest.getLongitude() != null ? signUpRequest.getLongitude() : 0.0);

            // Set Phone Number if provided
            if (signUpRequest.getPhoneNumber() != null) {
                company.setPhoneNumber(signUpRequest.getPhoneNumber());
            }
            company.setAddress(signUpRequest.getAddress());
            companyRepository.save(company);
            user.setCompany(company);
        } else {
            // Default to Client
            user.setRole(Role.ROLE_CLIENT);
            user.setEnabled(true);
        }

        userRepository.save(user);

        // Link to existing customer records in any store
        linkUserToExistingCustomers(user);

        if (!user.isEnabled()) {
            emailService.sendVerificationEmail(user.getEmail(), user.getVerificationCode(), customBackendUrl);
        }

        return user;
    }

    private void linkUserToExistingCustomers(User user) {
        // Link by Email
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            List<Customer> byEmail = customerRepository.findByEmail(user.getEmail());
            for (Customer c : byEmail) {
                if (c.getUserId() == null) {
                    c.setUserId(user.getId());
                    customerRepository.save(c);
                }
            }
        }

        // Link by Cedula
        if (user.getCedula() != null && !user.getCedula().isBlank()) {
            List<Customer> byCedula = customerRepository.findByCedula(user.getCedula());
            for (Customer c : byCedula) {
                if (c.getUserId() == null) {
                    c.setUserId(user.getId());
                    customerRepository.save(c);
                }
            }
        }
    }
}
