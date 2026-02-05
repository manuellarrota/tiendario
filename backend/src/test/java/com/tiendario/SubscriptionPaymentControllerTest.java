package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SubscriptionPaymentRepository;
import com.tiendario.security.UserDetailsImpl;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SubscriptionPaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SubscriptionPaymentRepository paymentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setName("Manager Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        testCompany = companyRepository.save(testCompany);

        // Mock security context for MANAGER role with companyId
        UserDetailsImpl userDetails = new UserDetailsImpl(1L, "manager", "password",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MANAGER")),
                testCompany.getId(), true);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null,
                userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void submitPayment_ShouldSucceed() throws Exception {
        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setAmount(new BigDecimal("15.00"));
        payment.setPaymentMethod("Zelle");
        payment.setReference("Z-999");

        mockMvc.perform(post("/api/payments/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payment)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("enviado")));
    }

    @Test
    void getMyPayments_ShouldReturnList() throws Exception {
        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setCompany(testCompany);
        payment.setAmount(new BigDecimal("15.00"));
        payment.setPaymentMethod("Zelle");
        payment.setReference("Z-888");
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        mockMvc.perform(get("/api/payments/my-payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.reference == 'Z-888')]", hasSize(1)));
    }
}
