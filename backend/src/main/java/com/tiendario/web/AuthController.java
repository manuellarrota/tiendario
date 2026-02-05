package com.tiendario.web;

import com.tiendario.domain.Company;
import com.tiendario.domain.Role;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.domain.User;
import com.tiendario.payload.request.LoginRequest;
import com.tiendario.payload.request.SignupRequest;
import com.tiendario.payload.response.JwtResponse;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.UserRepository;
import com.tiendario.security.JwtUtils;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                roles,
                userDetails.getCompanyId(),
                userDetails.getCompanyId() != null
                        ? companyRepository.findById(userDetails.getCompanyId()).get().getSubscriptionStatus()
                                .toString()
                        : "FREE"));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        // Create new user's account
        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));

        Set<String> strRoles = signUpRequest.getRole();
        String roleStr = (strRoles != null && !strRoles.isEmpty()) ? strRoles.iterator().next() : "client";

        // Prevent Super Admin creation via public API
        if ("admin".equalsIgnoreCase(roleStr)) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Super Admin registration is not allowed via public API."));
        }

        if ("manager".equalsIgnoreCase(roleStr)) {
            // Manager ALWAYS needs a Company
            if (signUpRequest.getCompanyName() == null || signUpRequest.getCompanyName().isEmpty()) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Error: Company Name is required for Managers."));
            }
            user.setRole(Role.ROLE_MANAGER);

            // Create Company
            Company company = new Company();
            company.setName(signUpRequest.getCompanyName());
            company.setSubscriptionStatus(SubscriptionStatus.FREE);
            // Default location if missing (or could be 0.0)
            company.setLatitude(signUpRequest.getLatitude() != null ? signUpRequest.getLatitude() : 0.0);
            company.setLongitude(signUpRequest.getLongitude() != null ? signUpRequest.getLongitude() : 0.0);
            companyRepository.save(company);
            user.setCompany(company);
        } else {
            // Default to Client
            user.setRole(Role.ROLE_CLIENT);
        }

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
