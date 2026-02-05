package com.tiendario;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiendario.domain.*;
import com.tiendario.repository.CategoryRepository;
import com.tiendario.repository.CompanyRepository;
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
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Company testCompany;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        // Create test company
        testCompany = new Company();
        testCompany.setName("Category Test Co");
        testCompany.setSubscriptionStatus(SubscriptionStatus.PAID);
        testCompany = companyRepository.save(testCompany);

        // Create test category
        testCategory = new Category();
        testCategory.setName("Test Category");
        testCategory.setCompany(testCompany);
        testCategory = categoryRepository.save(testCategory);

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
    void getCategories_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].name", is("Test Category")));
    }

    @Test
    void createCategory_ShouldSucceed() throws Exception {
        Category newCategory = new Category();
        newCategory.setName("New Category");

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("created")));

        assert categoryRepository.findByCompanyId(testCompany.getId()).size() >= 2;
    }

    @Test
    void deleteCategory_ShouldSucceed() throws Exception {
        mockMvc.perform(delete("/api/categories/" + testCategory.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("deleted")));

        assert !categoryRepository.existsById(testCategory.getId());
    }

    @Test
    void deleteCategory_ShouldFail_WhenNotFound() throws Exception {
        mockMvc.perform(delete("/api/categories/99999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not found")));
    }

    @Test
    void deleteCategory_ShouldFail_WhenBelongsToOtherCompany() throws Exception {
        // Create another company and category
        Company otherCompany = new Company();
        otherCompany.setName("Other Company");
        otherCompany.setSubscriptionStatus(SubscriptionStatus.FREE);
        otherCompany = companyRepository.save(otherCompany);

        Category otherCategory = new Category();
        otherCategory.setName("Other Category");
        otherCategory.setCompany(otherCompany);
        otherCategory = categoryRepository.save(otherCategory);

        // Try to delete other company's category
        mockMvc.perform(delete("/api/categories/" + otherCategory.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("denied")));
    }
}
