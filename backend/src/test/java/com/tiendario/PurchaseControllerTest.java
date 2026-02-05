package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.payload.request.PurchaseRequest;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.PurchaseRepository;
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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class PurchaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PurchaseRepository purchaseRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private Product testProduct;
    private Supplier testSupplier;

    @BeforeEach
    void setUp() {
        // Clear data
        purchaseRepository.deleteAll();
        productRepository.deleteAll();

        // Create test company
        testCompany = new Company();
        testCompany.setName("Purchase Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test supplier
        testSupplier = new Supplier();
        testSupplier.setName("Test Supplier");
        testSupplier.setCompany(testCompany);
        testSupplier = supplierRepository.save(testSupplier);

        // Create test product
        testProduct = new Product();
        testProduct.setName("Purchase Test Product");
        testProduct.setPrice(new BigDecimal("100.00"));
        testProduct.setCostPrice(new BigDecimal("70.00"));
        testProduct.setStock(50);
        testProduct.setSku("PURCH-001");
        testProduct.setCompany(testCompany);
        testProduct = productRepository.save(testProduct);

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
    void getPurchases_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/purchases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(List.class)));
    }

    @Test
    void createPurchase_ShouldSucceed() throws Exception {
        int initialStock = testProduct.getStock();

        PurchaseRequest request = new PurchaseRequest();
        request.setSupplierId(testSupplier.getId());
        request.setTotal(new BigDecimal("500.00"));

        List<PurchaseRequest.PurchaseItemRequest> items = new ArrayList<>();
        PurchaseRequest.PurchaseItemRequest item = new PurchaseRequest.PurchaseItemRequest();
        item.setProductId(testProduct.getId());
        item.setQuantity(10);
        item.setUnitCost(new BigDecimal("50.00"));
        items.add(item);

        request.setItems(items);

        mockMvc.perform(post("/api/purchases")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("recorded")));

        // Verify stock was increased
        Product updatedProduct = productRepository.findById(testProduct.getId()).orElse(null);
        assert updatedProduct != null;
        assert updatedProduct.getStock() == initialStock + 10;
    }

    @Test
    void createPurchase_ShouldUpdateCostPrice() throws Exception {
        PurchaseRequest request = new PurchaseRequest();
        request.setTotal(new BigDecimal("600.00"));

        List<PurchaseRequest.PurchaseItemRequest> items = new ArrayList<>();
        PurchaseRequest.PurchaseItemRequest item = new PurchaseRequest.PurchaseItemRequest();
        item.setProductId(testProduct.getId());
        item.setQuantity(10);
        item.setUnitCost(new BigDecimal("60.00")); // New cost price
        items.add(item);

        request.setItems(items);

        mockMvc.perform(post("/api/purchases")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify cost price was updated
        Product updatedProduct = productRepository.findById(testProduct.getId()).orElse(null);
        assert updatedProduct != null;
        assert updatedProduct.getCostPrice().compareTo(new BigDecimal("60.00")) == 0;
    }

    @Test
    void createPurchase_ShouldWorkWithoutSupplier() throws Exception {
        PurchaseRequest request = new PurchaseRequest();
        request.setTotal(new BigDecimal("200.00"));
        // No supplier ID set

        List<PurchaseRequest.PurchaseItemRequest> items = new ArrayList<>();
        PurchaseRequest.PurchaseItemRequest item = new PurchaseRequest.PurchaseItemRequest();
        item.setProductId(testProduct.getId());
        item.setQuantity(5);
        item.setUnitCost(new BigDecimal("40.00"));
        items.add(item);

        request.setItems(items);

        mockMvc.perform(post("/api/purchases")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("recorded")));
    }
}
