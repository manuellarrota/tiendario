package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.SaleRepository;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SaleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private Product testProduct;
    private Sale testSale;

    @BeforeEach
    void setUp() {
        // Clear existing data
        saleRepository.deleteAll();
        productRepository.deleteAll();

        // Create test company
        testCompany = new Company();
        testCompany.setName("Sale Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test product
        testProduct = new Product();
        testProduct.setName("Test Product for Sale");
        testProduct.setPrice(new BigDecimal("50.00"));
        testProduct.setStock(100);
        testProduct.setSku("SALE-TEST-001");
        testProduct.setCompany(testCompany);
        testProduct = productRepository.save(testProduct);

        // Create existing sale
        testSale = new Sale();
        testSale.setCompany(testCompany);
        testSale.setDate(LocalDateTime.now());
        testSale.setStatus(SaleStatus.PENDING);
        testSale.setItems(new ArrayList<>());
        testSale = saleRepository.save(testSale);

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
    void getCompanySales_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/sales"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createSale_ShouldSucceed() throws Exception {
        int initialStock = testProduct.getStock();

        // Build sale with items
        Sale newSale = new Sale();
        List<SaleItem> items = new ArrayList<>();

        SaleItem item = new SaleItem();
        Product productRef = new Product();
        productRef.setId(testProduct.getId());
        item.setProduct(productRef);
        item.setQuantity(2);
        items.add(item);

        newSale.setItems(items);

        mockMvc.perform(post("/api/sales")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSale)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("completed")));

        // Verify stock was reduced
        Product updatedProduct = productRepository.findById(testProduct.getId()).orElse(null);
        assert updatedProduct != null;
        assert updatedProduct.getStock() == initialStock - 2;
    }

    @Test
    void createSale_ShouldFail_WhenNoItems() throws Exception {
        Sale newSale = new Sale();
        newSale.setItems(new ArrayList<>());

        mockMvc.perform(post("/api/sales")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSale)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("at least one item")));
    }

    @Test
    void createSale_ShouldFail_WhenInsufficientStock() throws Exception {
        Sale newSale = new Sale();
        List<SaleItem> items = new ArrayList<>();

        SaleItem item = new SaleItem();
        Product productRef = new Product();
        productRef.setId(testProduct.getId());
        item.setProduct(productRef);
        item.setQuantity(9999); // More than stock
        items.add(item);

        newSale.setItems(items);

        mockMvc.perform(post("/api/sales")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSale)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Insufficient stock")));
    }

    @Test
    void createSale_ShouldFail_WhenNoProductId() throws Exception {
        Sale newSale = new Sale();
        List<SaleItem> items = new ArrayList<>();

        SaleItem item = new SaleItem();
        item.setQuantity(1);
        // No product set
        items.add(item);

        newSale.setItems(items);

        mockMvc.perform(post("/api/sales")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newSale)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("product ID")));
    }

    @Test
    void updateSaleStatus_ShouldSucceed() throws Exception {
        mockMvc.perform(put("/api/sales/" + testSale.getId() + "/status")
                .param("status", "PAID"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("PAID")));

        Sale updated = saleRepository.findById(testSale.getId()).orElse(null);
        assert updated != null;
        assert updated.getStatus() == SaleStatus.PAID;
    }

    @Test
    void updateSaleStatus_ShouldFail_WhenSaleNotFound() throws Exception {
        mockMvc.perform(put("/api/sales/99999/status")
                .param("status", "PAID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }
}
