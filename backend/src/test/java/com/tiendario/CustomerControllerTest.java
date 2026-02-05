package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.CustomerRepository;
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

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Customer Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test customer
        testCustomer = new Customer();
        testCustomer.setName("John Doe");
        testCustomer.setEmail("john@example.com");
        testCustomer.setPhone("555-1234");
        testCustomer.setAddress("123 Main St");
        testCustomer.setCompany(testCompany);
        testCustomer = customerRepository.save(testCustomer);

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
    void getCustomers_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].name", is("John Doe")));
    }

    @Test
    void createCustomer_ShouldSucceed() throws Exception {
        Customer newCustomer = new Customer();
        newCustomer.setName("Jane Smith");
        newCustomer.setEmail("jane@example.com");
        newCustomer.setPhone("555-5678");

        mockMvc.perform(post("/api/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newCustomer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("created")));
    }

    @Test
    void createCustomer_ShouldFail_WhenEmailExists() throws Exception {
        Customer newCustomer = new Customer();
        newCustomer.setName("Another John");
        newCustomer.setEmail("john@example.com"); // Already exists

        mockMvc.perform(post("/api/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newCustomer)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("already registered")));
    }

    @Test
    void updateCustomer_ShouldSucceed() throws Exception {
        Customer updateDetails = new Customer();
        updateDetails.setName("John Updated");
        updateDetails.setEmail("john.updated@example.com");
        updateDetails.setPhone("555-9999");
        updateDetails.setAddress("456 New St");

        mockMvc.perform(put("/api/customers/" + testCustomer.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("updated")));

        Customer updated = customerRepository.findById(testCustomer.getId()).orElse(null);
        assert updated != null;
        assert "John Updated".equals(updated.getName());
    }

    @Test
    void updateCustomer_ShouldFail_WhenNotFound() throws Exception {
        Customer updateDetails = new Customer();
        updateDetails.setName("Some Name");

        mockMvc.perform(put("/api/customers/99999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDetails)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    void deleteCustomer_ShouldSucceed() throws Exception {
        mockMvc.perform(delete("/api/customers/" + testCustomer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("deleted")));

        assert !customerRepository.existsById(testCustomer.getId());
    }

    @Test
    void deleteCustomer_ShouldFail_WhenNotFound() throws Exception {
        mockMvc.perform(delete("/api/customers/99999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    void deleteCustomer_ShouldFail_WhenBelongsToOtherCompany() throws Exception {
        // Create another company and customer
        Company otherCompany = new Company();
        otherCompany.setName("Other Company");
        otherCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        otherCompany = companyRepository.save(otherCompany);

        Customer otherCustomer = new Customer();
        otherCustomer.setName("Other Customer");
        otherCustomer.setEmail("other@example.com");
        otherCustomer.setCompany(otherCompany);
        otherCustomer = customerRepository.save(otherCustomer);

        // Try to delete other company's customer
        mockMvc.perform(delete("/api/customers/" + otherCustomer.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("denied")));
    }
}
