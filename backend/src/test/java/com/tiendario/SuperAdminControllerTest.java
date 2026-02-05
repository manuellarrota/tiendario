package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SuperAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SubscriptionPaymentRepository paymentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private SubscriptionPayment testPayment;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setName("SuperAdmin Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        testCompany = companyRepository.save(testCompany);

        testPayment = new SubscriptionPayment();
        testPayment.setCompany(testCompany);
        testPayment.setAmount(new BigDecimal("29.99"));
        testPayment.setPaymentMethod("PayPal");
        testPayment.setReference("PAY-123");
        testPayment.setStatus(PaymentStatus.PENDING);
        testPayment = paymentRepository.save(testPayment);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllPayments_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/superadmin/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.reference == 'PAY-123')]", hasSize(1)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void approvePayment_ShouldSucceed() throws Exception {
        mockMvc.perform(post("/api/superadmin/payments/" + testPayment.getId() + "/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("approved")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectPayment_ShouldSucceed() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("reason", "Invalid proof");

        mockMvc.perform(post("/api/superadmin/payments/" + testPayment.getId() + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("rejected")));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void getAllPayments_AsManager_ShouldBeForbidden() throws Exception {
        mockMvc.perform(get("/api/superadmin/payments"))
                .andExpect(status().isForbidden());
    }
}
