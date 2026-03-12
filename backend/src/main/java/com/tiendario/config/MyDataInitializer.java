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

            // Ensure base categories always exist
            seedBaseCategories();

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
            System.err.println("DEBUG: Users and Companies created/verified.");

            // Create Demo Products
            createProduct("Zapatillas Nike Air", "DEPO-ZAPA-0001", new BigDecimal("120.00"), 50, "Zapatería", company1);
            createProduct("Camiseta Adidas", "ROPA-CAMI-0002", new BigDecimal("35.00"), 100, "Tienda de ropa", company1);
            createProduct("Reloj Casio Digital", "TECN-RELO-0003", new BigDecimal("55.00"), 25, "Electrónica / celulares", company1);
            createProduct("Arroz Integral 1kg", "ALIM-ARRO-0004", new BigDecimal("3.50"), 200, "Supermercado", company1);
            createProduct("Aceite de Oliva 500ml", "ALIM-ACEI-0005", new BigDecimal("8.90"), 75, "Supermercado", company1);

            createProduct("Gorra Puma", "ROPA-GORR-0006", new BigDecimal("25.00"), 30, "Tienda de ropa", company2);
            createProduct("Café Colombiano", "ALIM-CAFE-0007", new BigDecimal("12.00"), 60, "Supermercado", company2);

            // Shared Products (multi-store verification)
            // Same SKU as company1, different price/stock
            createProduct("Camiseta Adidas", "ROPA-CAMI-0002", new BigDecimal("32.50"), 15, "Tienda de ropa", company2);
            createProduct("Zapatillas Nike Air", "DEPO-ZAPA-0001", new BigDecimal("118.00"), 5, "Zapatería", company2);

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

                    if (name.equals("Tienda Demo Premium")) {
                        c.setLatitude(7.7711);
                        c.setLongitude(-72.2285);
                    } else if (name.equals("Tienda Egar")) {
                        c.setLatitude(7.7801);
                        c.setLongitude(-72.2150);
                    } else {
                        c.setLatitude(0.0);
                        c.setLongitude(0.0);
                    }

                    return companyRepository.save(c);
                });
    }

    private void seedBaseCategories() {
        String[] baseCategories = {
                "Restaurante", "Cafetería", "Panadería", "Pastelería", "Heladería",
                "Mini market / Bodega", "Supermercado", "Carnicería", "Pescadería",
                "Frutería / Verdulería", "Farmacia", "Ferretería", "Tienda de ropa",
                "Zapatería", "Electrónica / celulares", "Tienda de mascotas",
                "Licorería", "Floristería", "Tienda de regalos / variedades", "Papelería"
        };

        // Clean up old categories that are no longer needed
        String[] oldCategories = {"Ropa", "Tecnología", "Alimentos", "Deportes"};
        for (String old : oldCategories) {
            categoryRepository.findFirstByNameIgnoreCase(old).ifPresent(c -> {
                // Check if any product is using it before deleting or just let it fail/handle it
                // For a "clean up" we'll just delete them
                try {
                    categoryRepository.delete(c);
                } catch (Exception e) {
                    System.err.println("Could not delete category " + old + " (probably in use)");
                }
            });
        }

        for (String catName : baseCategories) {
            createCategory(catName);
        }
        System.err.println("✓ Base categories verified/created.");
    }

    private void createCategory(String name) {
        if (!categoryRepository.findFirstByNameIgnoreCase(name).isPresent()) {
            Category cat = new Category();
            cat.setName(name);
            categoryRepository.save(cat);
        }
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
        createUser("admin", "Admin123!", Role.ROLE_ADMIN, null);
        createUser("manager_pro", "Manager123!", Role.ROLE_MANAGER, company1);
        createUser("manager_free", "Manager123!", Role.ROLE_MANAGER, company2);
        createUser("cliente", "Cliente123!", Role.ROLE_CLIENT, null);

        System.err.println("═══════════════════════════════════════════");
        System.err.println("  DEV CREDENTIALS (H2 in-memory DB only):");
        System.err.println("  admin       / Admin123!     (Super Admin)");
        System.err.println("  manager_pro / Manager123!   (Tienda Demo Premium)");
        System.err.println("  manager_free/ Manager123!   (Tienda Egar)");
        System.err.println("  cliente     / Cliente123!   (Cliente marketplace)");
        System.err.println("═══════════════════════════════════════════");
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
