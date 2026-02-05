package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.security.UserDetailsImpl;
import com.tiendario.service.ProductIndexService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
public class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductIndexService productIndexService;

    private Company testCompany;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Product Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test product
        testProduct = new Product();
        testProduct.setName("Test Laptop");
        testProduct.setDescription("A powerful laptop");
        testProduct.setPrice(new BigDecimal("999.99"));
        testProduct.setCostPrice(new BigDecimal("750.00"));
        testProduct.setStock(50);
        testProduct.setSku("ELEC-LAP-001");
        testProduct.setCompany(testCompany);
        testProduct.setCategory("Electronics");
        testProduct = productRepository.save(testProduct);

        // Setup security context for MANAGER role
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
    void getCompanyProducts_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].name", is("Test Laptop")));
    }

    @Test
    void createProduct_ShouldSucceed() throws Exception {
        Product newProduct = new Product();
        newProduct.setName("New Phone");
        newProduct.setDescription("Latest smartphone");
        newProduct.setPrice(new BigDecimal("599.99"));
        newProduct.setStock(100);
        newProduct.setSku("PHONE-001");

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("New Phone")));
    }

    @Test
    void createProduct_ShouldSetSku_WhenProvided() throws Exception {
        Product newProduct = new Product();
        newProduct.setName("Custom SKU Product");
        newProduct.setPrice(new BigDecimal("199.99"));
        newProduct.setStock(20);
        newProduct.setSku("CUSTOM-SKU-123");

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku", is("CUSTOM-SKU-123")));
    }

    @Test
    void createProduct_ShouldFail_WhenSkuExists() throws Exception {
        Product newProduct = new Product();
        newProduct.setName("Duplicate SKU Product");
        newProduct.setPrice(new BigDecimal("199.99"));
        newProduct.setStock(20);
        newProduct.setSku("ELEC-LAP-001"); // Already exists

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("SKU already exists")));
    }

    @Test
    void updateProduct_ShouldSucceed() throws Exception {
        Product updateDetails = new Product();
        updateDetails.setName("Updated Laptop");
        updateDetails.setDescription("Updated description");
        updateDetails.setPrice(new BigDecimal("899.99"));
        updateDetails.setStock(45);

        mockMvc.perform(put("/api/products/" + testProduct.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("updated")));

        Product updated = productRepository.findById(testProduct.getId()).orElse(null);
        assert updated != null;
        assert updated.getPrice().compareTo(new BigDecimal("899.99")) == 0;
    }

    @Test
    void updateProduct_ShouldFail_WhenProductNotFound() throws Exception {
        Product updateDetails = new Product();
        updateDetails.setName("Some Name");

        mockMvc.perform(put("/api/products/99999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDetails)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    void deleteProduct_ShouldSucceed() throws Exception {
        mockMvc.perform(delete("/api/products/" + testProduct.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("deleted")));

        assert !productRepository.existsById(testProduct.getId());
    }

    @Test
    void deleteProduct_ShouldFail_WhenProductNotFound() throws Exception {
        mockMvc.perform(delete("/api/products/99999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    void suggestSku_ShouldReturnSku() throws Exception {
        mockMvc.perform(get("/api/products/suggest-sku")
                .param("name", "Wireless Mouse")
                .param("category", "Electronics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestedSku", notNullValue()));
    }

    @Test
    void updateProduct_ShouldUpdateSku_WhenNewSkuProvided() throws Exception {
        Product updateDetails = new Product();
        updateDetails.setName(testProduct.getName());
        updateDetails.setPrice(testProduct.getPrice());
        updateDetails.setStock(testProduct.getStock());
        updateDetails.setSku("NEW-SKU-999");

        mockMvc.perform(put("/api/products/" + testProduct.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDetails)))
                .andExpect(status().isOk());

        Product updated = productRepository.findById(testProduct.getId()).orElse(null);
        assert updated != null;
        assert "NEW-SKU-999".equals(updated.getSku());
    }
}
