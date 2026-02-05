package com.tiendario;

import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CompanyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CompanyRepository companyRepository;

    private Company testCompany;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Company Profile Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        testCompany = companyRepository.save(testCompany);

        // Setup security context
        setupSecurityContext(testCompany.getId());
    }

    private void setupSecurityContext(Long companyId) {
        UserDetailsImpl userDetails = new UserDetailsImpl(1L, "manager", "password",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MANAGER")),
                companyId, true);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void getCompanyProfile_ShouldReturnCompany() throws Exception {
        mockMvc.perform(get("/api/company/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Company Profile Test Co")))
                .andExpect(jsonPath("$.subscriptionStatus", is("FREE")));
    }

    @Test
    void upgradeSubscription_ShouldSetPaidStatus() throws Exception {
        mockMvc.perform(post("/api/company/subscribe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("PAID")));

        Company updated = companyRepository.findById(testCompany.getId()).orElse(null);
        assert updated != null;
        assert updated.getSubscriptionStatus() == SubscriptionStatus.PAID;
    }

    @Test
    void downgradeSubscription_ShouldSetFreeStatus() throws Exception {
        // First upgrade
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        companyRepository.save(testCompany);

        // Then downgrade
        mockMvc.perform(post("/api/company/unsubscribe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("FREE")));

        Company updated = companyRepository.findById(testCompany.getId()).orElse(null);
        assert updated != null;
        assert updated.getSubscriptionStatus() == SubscriptionStatus.FREE;
    }
}
