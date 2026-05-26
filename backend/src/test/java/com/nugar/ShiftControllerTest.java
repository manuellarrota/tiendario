package com.nugar;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nugar.domain.*;
import com.nugar.repository.CashRegisterRepository;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.ShiftRepository;
import com.nugar.repository.UserRepository;
import com.nugar.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ShiftControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CashRegisterRepository cashRegisterRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private Company testCompany;
    private CashRegister testCashRegister;

    @BeforeEach
    void setUp() {
        shiftRepository.deleteAll();
        
        testCompany = new Company();
        testCompany.setName("Shift Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        testUser = new User();
        testUser.setUsername("cashier_test");
        testUser.setPassword("password");
        testUser.setRole(Role.ROLE_CASHIER);
        testUser.setCompany(testCompany);
        testUser = userRepository.save(testUser);

        // Create a cash register for the company
        testCashRegister = new CashRegister();
        testCashRegister.setName("Caja Principal");
        testCashRegister.setCompany(testCompany);
        testCashRegister.setStatus(CashRegisterStatus.CLOSED);
        testCashRegister = cashRegisterRepository.save(testCashRegister);

        setupSecurityContext(testUser, "ROLE_CASHIER");
    }

    private void setupSecurityContext(User user, String role) {
        UserDetailsImpl userDetails = new UserDetailsImpl(user.getId(), user.getUsername(), user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(role)),
                user.getCompany().getId(), true);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getCurrentShift_ShouldReturnNoContent_WhenNone() throws Exception {
        mockMvc.perform(get("/api/shifts/current"))
                .andExpect(status().isNoContent());
    }

    @Test
    void openShift_ShouldSucceed() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("initialCash", 100.0);
        payload.put("cashRegisterId", testCashRegister.getId());

        mockMvc.perform(post("/api/shifts/open")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initialCash").value(100.0))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void openShift_ShouldFail_WhenAlreadyOpen() throws Exception {
        Shift shift = new Shift();
        shift.setUser(testUser);
        shift.setCompany(testCompany);
        shift.setStatus(ShiftStatus.OPEN);
        shiftRepository.save(shift);

        Map<String, Object> payload = new HashMap<>();
        mockMvc.perform(post("/api/shifts/open")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void closeShift_ShouldSucceed() throws Exception {
        Shift shift = new Shift();
        shift.setUser(testUser);
        shift.setCompany(testCompany);
        shift.setStatus(ShiftStatus.OPEN);
        shift.setInitialCash(BigDecimal.valueOf(100));
        shift = shiftRepository.save(shift);

        Map<String, Object> payload = new HashMap<>();
        payload.put("reportedCash", 150.0);
        payload.put("observation", "Everything ok");

        mockMvc.perform(post("/api/shifts/" + shift.getId() + "/close")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.reportedCash").value(150.0));
    }

    @Test
    void verifyShift_ShouldSucceed_ForManager() throws Exception {
        Shift shift = new Shift();
        shift.setUser(testUser);
        shift.setCompany(testCompany);
        shift.setStatus(ShiftStatus.CLOSED);
        shift = shiftRepository.save(shift);

        // Switch to manager role
        setupSecurityContext(testUser, "ROLE_MANAGER");

        Map<String, String> payload = new HashMap<>();
        payload.put("observation", "Verified by manager");

        mockMvc.perform(post("/api/shifts/" + shift.getId() + "/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"));
    }
}
