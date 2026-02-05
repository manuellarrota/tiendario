package com.tiendario;

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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private CompanyRepository companyRepository;

    private Company testCompany;

    @BeforeEach
    void setUp() {
        // Clear data
        saleRepository.deleteAll();
        productRepository.deleteAll();

        // Create test company
        testCompany = new Company();
        testCompany.setName("Dashboard Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create products with different stock levels
        Product p1 = createProduct("Product 1", new BigDecimal("100.00"), new BigDecimal("70.00"), 50, 5);
        createProduct("Product 2", new BigDecimal("200.00"), new BigDecimal("150.00"), 3, 5); // Low stock
        createProduct("Product 3", new BigDecimal("50.00"), new BigDecimal("30.00"), 100, 10);

        // Create a sale for today with totalAmount set
        Sale sale = new Sale();
        sale.setCompany(testCompany);
        sale.setDate(LocalDateTime.now());
        sale.setStatus(SaleStatus.PAID);
        sale.setTotalAmount(new BigDecimal("200.00")); // Set the total amount
        sale.setItems(new ArrayList<>());
        sale = saleRepository.save(sale);

        SaleItem item = new SaleItem();
        item.setSale(sale);
        item.setQuantity(2);
        item.setProduct(p1);
        sale.getItems().add(item);

        saleRepository.save(sale);

        // Setup security context
        setupSecurityContext(testCompany.getId());
    }

    private Product createProduct(String name, BigDecimal price, BigDecimal costPrice, int stock, int minStock) {
        Product product = new Product();
        product.setName(name);
        product.setPrice(price);
        product.setCostPrice(costPrice);
        product.setStock(stock);
        product.setMinStock(minStock);
        product.setSku("DASH-" + name.replace(" ", "-"));
        product.setCompany(testCompany);
        return productRepository.save(product);
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
    void getDashboardSummary_ShouldReturnMetrics() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts", is(3)))
                .andExpect(jsonPath("$.lowStockCount", notNullValue()))
                .andExpect(jsonPath("$.revenueToday", notNullValue()))
                .andExpect(jsonPath("$.salesCountToday", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.averageMargin", notNullValue()));
    }

    @Test
    void getDashboardSummary_ShouldCalculateMargin() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageMargin", greaterThan(0.0)));
    }

    @Test
    void getDashboardSummary_ShouldCountLowStock() throws Exception {
        // Add more low stock products (stock <= minStock)
        createProduct("Low Stock Item", new BigDecimal("25.00"), new BigDecimal("15.00"), 2, 5);

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lowStockCount", greaterThanOrEqualTo(1)));
    }
}
