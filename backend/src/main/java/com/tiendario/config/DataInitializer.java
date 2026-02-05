package com.tiendario.config;

import com.tiendario.domain.*;
import com.tiendario.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    public void run(String... args) throws Exception {
        // Only initialize if there are no products
        if (productRepository.count() > 0) {
            System.out.println("Database already has products. Skipping data seeding.");
            return;
        }

        System.out.println("Initializing database with seed data...");

        // Find existing companies or create demo ones
        Company company1 = companyRepository.findAll().stream()
                .filter(c -> SubscriptionStatus.PAID.equals(c.getSubscriptionStatus()))
                .findFirst()
                .orElseGet(() -> {
                    Company c = new Company();
                    c.setName("Tienda Demo Premium");
                    c.setSubscriptionStatus(SubscriptionStatus.PAID);
                    return companyRepository.save(c);
                });

        Company company2 = companyRepository.findAll().stream()
                .filter(c -> SubscriptionStatus.FREE.equals(c.getSubscriptionStatus()))
                .findFirst()
                .orElseGet(() -> {
                    Company c = new Company();
                    c.setName("Tienda Demo Free");
                    c.setSubscriptionStatus(SubscriptionStatus.FREE);
                    return companyRepository.save(c);
                });

        // Create Categories for company1
        Category catRopa = new Category();
        catRopa.setName("Ropa");
        catRopa.setCompany(company1);
        catRopa = categoryRepository.save(catRopa);

        Category catTecnologia = new Category();
        catTecnologia.setName("Tecnología");
        catTecnologia.setCompany(company1);
        catTecnologia = categoryRepository.save(catTecnologia);

        Category catAlimentos = new Category();
        catAlimentos.setName("Alimentos");
        catAlimentos.setCompany(company1);
        catAlimentos = categoryRepository.save(catAlimentos);

        Category catDeportes = new Category();
        catDeportes.setName("Deportes");
        catDeportes.setCompany(company1);
        catDeportes = categoryRepository.save(catDeportes);

        // Categories for company2
        Category catRopa2 = new Category();
        catRopa2.setName("Ropa");
        catRopa2.setCompany(company2);
        catRopa2 = categoryRepository.save(catRopa2);

        Category catAlimentos2 = new Category();
        catAlimentos2.setName("Alimentos");
        catAlimentos2.setCompany(company2);
        catAlimentos2 = categoryRepository.save(catAlimentos2);

        // Create Demo Products with Categories
        Product p1 = new Product();
        p1.setName("Zapatillas Nike Air");
        p1.setSku("DEPO-ZAPA-0001");
        p1.setPrice(new BigDecimal("120.00"));
        p1.setStock(50);
        p1.setCompany(company1);
        p1.setCategory("Deportes");
        productRepository.save(p1);

        Product p2 = new Product();
        p2.setName("Camiseta Adidas");
        p2.setSku("ROPA-CAMI-0002");
        p2.setPrice(new BigDecimal("35.00"));
        p2.setStock(100);
        p2.setCompany(company1);
        p2.setCategory("Ropa");
        productRepository.save(p2);

        Product p3 = new Product();
        p3.setName("Reloj Casio Digital");
        p3.setSku("TECN-RELO-0003");
        p3.setPrice(new BigDecimal("55.00"));
        p3.setStock(25);
        p3.setCompany(company1);
        p3.setCategory("Tecnología");
        productRepository.save(p3);

        Product p4 = new Product();
        p4.setName("Arroz Integral 1kg");
        p4.setSku("ALIM-ARRO-0004");
        p4.setPrice(new BigDecimal("3.50"));
        p4.setStock(200);
        p4.setCompany(company1);
        p4.setCategory("Alimentos");
        productRepository.save(p4);

        Product p5 = new Product();
        p5.setName("Aceite de Oliva 500ml");
        p5.setSku("ALIM-ACEI-0005");
        p5.setPrice(new BigDecimal("8.90"));
        p5.setStock(75);
        p5.setCompany(company1);
        p5.setCategory("Alimentos");
        productRepository.save(p5);

        Product p6 = new Product();
        p6.setName("Gorra Puma");
        p6.setSku("ROPA-GORR-0006");
        p6.setPrice(new BigDecimal("25.00"));
        p6.setStock(30);
        p6.setCompany(company2);
        p6.setCategory("Ropa");
        productRepository.save(p6);

        Product p7 = new Product();
        p7.setName("Café Colombiano 250g");
        p7.setSku("ALIM-CAFE-0007");
        p7.setPrice(new BigDecimal("12.00"));
        p7.setStock(60);
        p7.setCompany(company2);
        p7.setCategory("Alimentos");
        productRepository.save(p7);

        System.out.println("✓ Database initialized successfully with " + productRepository.count() + " products!");
        System.out.println("✓ Categories created: Ropa, Tecnología, Alimentos, Deportes");
    }
}
