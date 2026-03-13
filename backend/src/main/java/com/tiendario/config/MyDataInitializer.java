package com.tiendario.config;

import com.tiendario.domain.*;
import com.tiendario.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class MyDataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            System.err.println("DEBUG: DataInitializer running...");
            
            // 1. Ensure Super Admin
            createSuperAdmin("admin", "Admin123!");

            // 2. Ensure Demo Managers & Customers
            createManager("manager_pro", "Manager123!", "Tienda Pro", SubscriptionStatus.PAID);
            createManager("manager_free", "Manager123!", "Tienda Gratuita", SubscriptionStatus.FREE);
            createCustomer("cliente", "Cliente123!");


            // 3. Seed requested categories
            seedBaseCategories();

            // 4. Seed 100 products per category
            seedDemoProducts();


            System.err.println("✓ Initialization complete. Base categories, Demo Products and Super Admin ready.");

        } catch (Exception e) {
            System.err.println("ERROR during DataInitializer execution:");
            e.printStackTrace();
        }
    }

    private void createSuperAdmin(String username, String password) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(Role.ROLE_ADMIN);
            user.setEnabled(true);
            user.setEmail(username + "@tiendario.com");
            userRepository.save(user);
            System.err.println("✓ Created Super Admin user: " + username);
        }
    }

    private void createManager(String username, String password, String companyName, SubscriptionStatus status) {
        if (!userRepository.existsByUsername(username)) {
            Company company = companyRepository.findByName(companyName)
                    .orElseGet(() -> {
                        Company c = new Company();
                        c.setName(companyName);
                        c.setSubscriptionStatus(status);
                        c.setDescription("Tienda de demostración para " + username);
                        return companyRepository.save(c);
                    });

            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(Role.ROLE_MANAGER);
            user.setEnabled(true);
            user.setEmail(username + "@tiendario.com");
            user.setCompany(company);
            userRepository.save(user);
            System.err.println("✓ Created Manager user: " + username + " for company: " + companyName);
        }
    }

    private void createCustomer(String username, String password) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(Role.ROLE_CLIENT);
            user.setEnabled(true);
            user.setEmail(username + "@tiendario.com");
            user.setPoints(100); // Start with some demo points
            userRepository.save(user);
            System.err.println("✓ Created Customer user: " + username);
        }
    }

    private void seedBaseCategories() {
        String[] baseCategories = {
                "Restaurante", "Cafetería", "Panadería", "Pastelería", "Heladería",
                "Mini market / Bodega", "Supermercado", "Carnicería", "Pescadería",
                "Frutería / Verdulería", "Farmacia", "Ferretería", "Tienda de ropa",
                "Zapatería", "Electrónica / celulares", "Tienda de mascotas",
                "Licorería", "Floristería", "Tienda de regalos / variedades", "Papelería"
        };

        for (String catName : baseCategories) {
            if (!categoryRepository.findFirstByNameIgnoreCase(catName).isPresent()) {
                Category cat = new Category();
                cat.setName(catName);
                categoryRepository.save(cat);
                System.err.println("✓ Created category: " + catName);
            }
        }
    }

    private void seedDemoProducts() {
        // Ensure a demo company exists to host products
        Company demoStore = companyRepository.findByName("Tienda Demo")
                .orElseGet(() -> {
                    Company c = new Company();
                    c.setName("Tienda Demo");
                    c.setDescription("Tienda para demostración de productos");
                    c.setSubscriptionStatus(SubscriptionStatus.PAID);
                    c.setLatitude(7.767);
                    c.setLongitude(-72.224);
                    return companyRepository.save(c);
                });

        String[] baseCategories = {
                "Restaurante", "Cafetería", "Panadería", "Pastelería", "Heladería",
                "Mini market / Bodega", "Supermercado", "Carnicería", "Pescadería",
                "Frutería / Verdulería", "Farmacia", "Ferretería", "Tienda de ropa",
                "Zapatería", "Electrónica / celulares", "Tienda de mascotas",
                "Licorería", "Floristería", "Tienda de regalos / variedades", "Papelería"
        };

        for (int catIdx = 0; catIdx < baseCategories.length; catIdx++) {
            String catName = baseCategories[catIdx];
            Optional<Category> catOpt = categoryRepository.findFirstByNameIgnoreCase(catName);
            if (catOpt.isPresent()) {
                // Check if we already have products for this category to avoid duplicates
                long count = productRepository.countByCategory(catName);
                if (count < 100) {
                    System.err.println("Seeding " + (100 - count) + " products for " + catName + "...");
                    String skuPrefix = String.format("C%02d", catIdx + 1); // C01, C02, etc.
                    for (int i = (int)count + 1; i <= 100; i++) {
                        Product p = new Product();
                        p.setName(catName + " Producto " + i);
                        p.setDescription("Descripción para " + catName + " item " + i);
                        p.setPrice(new BigDecimal(10 + i));
                        p.setStock(50);
                        p.setCategory(catName);
                        p.setCompany(demoStore);
                        p.setSku(skuPrefix + "-" + i);
                        productRepository.save(p);
                    }
                }
            }
        }
    }
}
