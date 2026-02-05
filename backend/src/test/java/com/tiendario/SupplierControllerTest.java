package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.SupplierRepository;
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
public class SupplierControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private Supplier testSupplier;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Supplier Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test supplier
        testSupplier = new Supplier();
        testSupplier.setName("Test Supplier Inc");
        testSupplier.setEmail("supplier@test.com");
        testSupplier.setPhone("555-1234");
        testSupplier.setCompany(testCompany);
        testSupplier = supplierRepository.save(testSupplier);

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
    void getSuppliers_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/suppliers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].name", is("Test Supplier Inc")));
    }

    @Test
    void createSupplier_ShouldSucceed() throws Exception {
        Supplier newSupplier = new Supplier();
        newSupplier.setName("New Supplier");
        newSupplier.setEmail("new@supplier.com");
        newSupplier.setPhone("555-9999");

        mockMvc.perform(post("/api/suppliers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSupplier)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("New Supplier")))
                .andExpect(jsonPath("$.email", is("new@supplier.com")));
    }
}
