package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.Company;
import com.tiendario.domain.Role;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.domain.User;
import com.tiendario.payload.request.LoginRequest;
import com.tiendario.payload.request.SignupRequest;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private Company testCompany;

    @BeforeEach
    void setUp() {
        // Create a test company
        testCompany = new Company();
        testCompany.setName("Test Company");
        testCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        testCompany = companyRepository.save(testCompany);

        // Create a test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setRole(Role.ROLE_MANAGER);
        testUser.setCompany(testCompany);
        testUser = userRepository.save(testUser);
    }

    @Test
    void signin_ShouldReturnJwtToken_WhenCredentialsAreValid() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.roles", hasItem("ROLE_MANAGER")));
    }

    @Test
    void signin_ShouldReturn401_WhenCredentialsAreInvalid() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signup_ShouldCreateNewUser_AsClient() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("newclient");
        signupRequest.setPassword("password123");
        Set<String> roles = new HashSet<>();
        roles.add("client");
        signupRequest.setRole(roles);

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("registered successfully")));

        // Verify user was created
        assert userRepository.existsByUsername("newclient");
    }

    @Test
    void signup_ShouldCreateNewUser_AsManager_WithCompany() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("newmanager");
        signupRequest.setPassword("password123");
        signupRequest.setCompanyName("My New Store");
        Set<String> roles = new HashSet<>();
        roles.add("manager");
        signupRequest.setRole(roles);

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("registered successfully")));

        // Verify user and company were created
        User newUser = userRepository.findByUsername("newmanager").orElse(null);
        assert newUser != null;
        assert newUser.getRole() == Role.ROLE_MANAGER;
        assert newUser.getCompany() != null;
        assert newUser.getCompany().getName().equals("My New Store");
    }

    @Test
    void signup_ShouldReturnError_WhenUsernameExists() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("testuser"); // Already exists
        signupRequest.setPassword("password123");

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("already taken")));
    }

    @Test
    void signup_ShouldCreateAdmin_WhenRoleIsAdmin() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("newadmin");
        signupRequest.setPassword("adminpass123");
        Set<String> roles = new HashSet<>();
        roles.add("admin");
        signupRequest.setRole(roles);

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("registered successfully")));

        User newAdmin = userRepository.findByUsername("newadmin").orElse(null);
        assert newAdmin != null;
        assert newAdmin.getRole() == Role.ROLE_ADMIN;
    }
}
