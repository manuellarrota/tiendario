package com.tiendario.config;

import com.tiendario.domain.Company;
import com.tiendario.domain.Category;
import com.tiendario.domain.Product;
import com.tiendario.domain.User;
import com.tiendario.domain.Role;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.CategoryRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
public class MyDataInitializer implements CommandLineRunner {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            System.err.println("DEBUG: DataInitializer running... checking DB state.");
            long count = productRepository.count();
            System.err.println("DEBUG: Product count: " + count);

            // Only initialize if there are no products
            if (count > 0) {
                System.err.println("Database seems already initialized. checking Users...");
                createUsers(); // Call verify/create users even if prod exist
                System.err.println("Skipping product seeding.");
                return;
            }

            System.err.println("Initializing database with seed data...");

            // Find existing companies or create demo ones
            Company company1 = findOrCreateCompany("Tienda Demo Premium", SubscriptionStatus.PAID);
            System.err.println("DEBUG: Company 1 created/found: " + company1.getName());

            Company company2 = findOrCreateCompany("Tienda Egar", SubscriptionStatus.PAID);
            System.err.println("DEBUG: Company 2 created/found: " + company2.getName());

            // Create Users (Admin, Managers, Client)
            createUsers(company1, company2);

            // Create Categories for company1
            createCategory("Ropa", company1);
            createCategory("Tecnología", company1);
            createCategory("Alimentos", company1);
            createCategory("Deportes", company1);

            // Categories for company2
            createCategory("Ropa", company2);
            createCategory("Alimentos", company2);

            System.err.println("DEBUG: Categories created.");

            // Create Demo Products
            createProduct("Zapatillas Nike Air", "DEPO-ZAPA-0001", new BigDecimal("120.00"), 50, "Deportes", company1);
            createProduct("Camiseta Adidas", "ROPA-CAMI-0002", new BigDecimal("35.00"), 100, "Ropa", company1);
            createProduct("Reloj Casio Digital", "TECN-RELO-0003", new BigDecimal("55.00"), 25, "Tecnología", company1);
            createProduct("Arroz Integral 1kg", "ALIM-ARRO-0004", new BigDecimal("3.50"), 200, "Alimentos", company1);
            createProduct("Aceite de Oliva 500ml", "ALIM-ACEI-0005", new BigDecimal("8.90"), 75, "Alimentos", company1);

            createProduct("Gorra Puma", "ROPA-GORR-0006", new BigDecimal("25.00"), 30, "Ropa", company2);
            createProduct("Café Colombiano", "ALIM-CAFE-0007", new BigDecimal("12.00"), 60, "Alimentos", company2);

            // Shared Products (multi-store verification)
            // Same SKU as company1, different price/stock
            createProduct("Camiseta Adidas", "ROPA-CAMI-0002", new BigDecimal("32.50"), 15, "Ropa", company2);
            createProduct("Zapatillas Nike Air", "DEPO-ZAPA-0001", new BigDecimal("118.00"), 5, "Deportes", company2);

            System.err.println("✓ Database initialized successfully with " + productRepository.count() + " products!");

        } catch (Exception e) {
            System.err.println("ERROR during DataInitializer execution:");
            e.printStackTrace();
        }
    }

    private Company findOrCreateCompany(String name, SubscriptionStatus status) {
        return companyRepository.findAll().stream()
                .filter(c -> name.equals(c.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Company c = new Company();
                    c.setName(name);
                    c.setSubscriptionStatus(status);
                    return companyRepository.save(c);
                });
    }

    private void createCategory(String name, Company company) {
        Category cat = new Category();
        cat.setName(name);
        cat.setCompany(company);
        categoryRepository.save(cat);
    }

    private void createProduct(String name, String sku, BigDecimal price, int stock, String categoryName,
            Company company) {
        Product p = new Product();
        p.setName(name);
        p.setSku(sku);
        p.setPrice(price);
        p.setStock(stock);
        p.setCompany(company);
        p.setCategory(categoryName);
        productRepository.save(p);
    }

    private void createUsers() {
        // Reuse logic but need to fetch companies
        Company company1 = companyRepository.findAll().stream()
                .filter(c -> "Tienda Demo Premium".equals(c.getName()))
                .findFirst().orElse(null);
        Company company2 = companyRepository.findAll().stream()
                .filter(c -> "Tienda Egar".equals(c.getName()))
                .findFirst().orElse(null);

        if (company1 != null && company2 != null) {
            createUsers(company1, company2);
        }
    }

    private void createUsers(Company company1, Company company2) {
        createUser("admin", "123456", Role.ROLE_ADMIN, null);
        createUser("manager_pro", "123456", Role.ROLE_MANAGER, company1);
        createUser("manager_free", "123456", Role.ROLE_MANAGER, company2);
        createUser("cliente", "123456", Role.ROLE_CLIENT, null);
    }

    private void createUser(String username, String password, Role role, Company company) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setCompany(company);
            user.setEnabled(true);
            user.setEmail(username + "@tiendario.com");
            userRepository.save(user);
            System.err.println("✓ Created user: " + username);
        }
    }
}
