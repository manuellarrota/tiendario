package com.tiendario.config;

import com.tiendario.domain.*;
import com.tiendario.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
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
    private SaleRepository saleRepository;

    @Autowired
    private PurchaseRepository purchaseRepository;

    @Autowired
    private SupplierRepository supplierRepository;

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
            createManager("manager_pro",  "Manager123!", "Ferretería Central",    SubscriptionStatus.PAID,  7.789354, -72.219738, "Av. 19 de Abril, San Cristóbal");
            createManager("manager_free", "Manager123!", "Minimarket El Rincón",  SubscriptionStatus.TRIAL, 7.792100, -72.215400, "Calle 5, Barrio Obrero, San Cristóbal");
            createCustomer("cliente", "Cliente123!");


            // 3. Seed requested categories
            seedBaseCategories();

            // 4. Seed 100 products per category
            seedDemoProducts();

            // 5. Seed detailed data for manager_pro
            seedManagerProData();

            System.err.println("✓ Initialization complete. Base categories, Demo Products and Super Admin ready.");

        } catch (Exception e) {
            System.err.println("ERROR during DataInitializer execution:");
            e.printStackTrace();
        }
    }

    private void seedManagerProData() {
        Optional<User> managerOpt = userRepository.findByUsername("manager_pro");
        if (managerOpt.isPresent()) {
            User manager = managerOpt.get();
            Company company = manager.getCompany();

            // Only seed if company has no products yet
            if (productRepository.countByCompanyId(company.getId()) == 0) {
                System.err.println("Seeding specialized data for " + manager.getUsername() + "...");

                // 1. Create Suppliers
                Supplier sup1 = new Supplier();
                sup1.setName("Ferretería Industrial S.A.");
                sup1.setCompany(company);
                sup1.setEmail("ventas@indsa.com");
                sup1.setPhone("+584147778899");
                supplierRepository.save(sup1);

                Supplier sup2 = new Supplier();
                sup2.setName("Herramientas Premium Táchira");
                sup2.setCompany(company);
                sup2.setEmail("contacto@hpt.com");
                supplierRepository.save(sup2);

                // 2. Create Products
                Product p1 = createProduct(company, "Taladro Percutor 750W", "Ferretería", "ST-001", 85.0, 45.0, 15, "1/2'' Professional", "Stanley");
                Product p2 = createProduct(company, "Martillo Galponero 16oz", "Ferretería", "ST-002", 12.5, 6.0, 40, "Acero Forjado", "Tramontina");
                Product p3 = createProduct(company, "Caja de Clavos 2'' (1kg)", "Ferretería", "ST-003", 5.0, 2.5, 100, "Acero Zincado", "Mezclum");
                Product p4 = createProduct(company, "Pintura Exterior Blanca 4L", "Ferretería", "ST-004", 35.0, 18.0, 20, "Mate - Clima Extremo", "Sherwin Williams");
                Product p5 = createProduct(company, "Set de Destornilladores (x6)", "Ferretería", "ST-005", 15.0, 8.0, 25, "Punta Imantada", "Truper");
                Product p6 = createProduct(company, "Cerradura de Pomo Bronce", "Ferretería", "ST-006", 22.0, 12.0, 18, "Dormitorio/Baño", "Cisa");

                // 3. Create Purchases (Stock entry)
                createPurchase(company, sup1, List.of(p1, p2, p3), java.time.LocalDateTime.now().minusDays(10), "INV-1001");
                createPurchase(company, sup2, List.of(p4, p5, p6), java.time.LocalDateTime.now().minusDays(5), "INV-5502");

                // 4. Create Sales (Diverse states and history)
                System.err.println("Generating historical sales for charting...");
                java.util.Random rnd = new java.util.Random();
                PaymentMethod[] methods = PaymentMethod.values();
                SaleStatus[] statuses = SaleStatus.values();
                String[] names = {"Juan Pérez", "María García", "Luis Rodríguez", "Ana Martínez", "Carlos Ruiz", "Elena Blanco", "Pedro Sánchez", "Santi Castro"};

                for (int i = 1; i <= 45; i++) {
                    java.time.LocalDateTime saleDate = java.time.LocalDateTime.now().minusDays(rnd.nextInt(30)).minusHours(rnd.nextInt(24));
                    SaleStatus randomStatus = statuses[rnd.nextInt(statuses.length)];
                    PaymentMethod randomMethod = methods[rnd.nextInt(methods.length)];
                    String randomName = names[rnd.nextInt(names.length)];
                    
                    // Pick 1-2 random products
                    Product randomP1 = p1;
                    if (rnd.nextBoolean()) randomP1 = p2;
                    List<Product> saleProducts = new java.util.ArrayList<>();
                    saleProducts.add(randomP1);
                    if (rnd.nextBoolean()) saleProducts.add(p3);

                    createSale(company, manager, randomName, saleProducts, randomStatus, randomMethod, saleDate);
                }
                
                System.err.println("✓ Manager Pro data seeded successfully with historical sales.");
            }
        }
    }

    private Product createProduct(Company company, String name, String category, String sku, double price, double cost, int stock, String variant, String brand) {
        Product p = new Product();
        p.setName(name);
        p.setCompany(company);
        p.setCategory(category);
        p.setSku(sku);
        p.setPrice(BigDecimal.valueOf(price));
        p.setCostPrice(BigDecimal.valueOf(cost));
        p.setStock(stock);
        p.setMinStock(5);
        p.setVariant(variant);
        p.setBrand(brand);
        return productRepository.save(p);
    }

    private void createPurchase(Company company, Supplier supplier, List<Product> products, java.time.LocalDateTime date, String invoice) {
        Purchase purchase = new Purchase();
        purchase.setCompany(company);
        purchase.setSupplier(supplier);
        purchase.setDate(date);
        purchase.setInvoiceNumber(invoice);
        
        BigDecimal total = BigDecimal.ZERO;
        List<PurchaseItem> items = new java.util.ArrayList<>();
        for (Product p : products) {
            PurchaseItem item = new PurchaseItem();
            item.setPurchase(purchase);
            item.setProduct(p);
            item.setQuantity(10);
            item.setUnitCost(p.getCostPrice());
            BigDecimal subtotal = p.getCostPrice().multiply(BigDecimal.valueOf(10));
            total = total.add(subtotal);
            items.add(item);
        }
        purchase.setItems(items);
        purchase.setTotal(total);
        purchaseRepository.save(purchase);
    }

    private void createSale(Company company, User user, String customerName, List<Product> products, SaleStatus status, PaymentMethod method, java.time.LocalDateTime date) {
        Sale sale = new Sale();
        sale.setCompany(company);
        sale.setUser(user);
        sale.setCustomerName(customerName);
        sale.setStatus(status);
        sale.setPaymentMethod(method);
        sale.setDate(date);
        sale.setPaymentCurrency("USD");
        sale.setExchangeRateUsed(BigDecimal.ONE);

        BigDecimal total = BigDecimal.ZERO;
        List<SaleItem> items = new java.util.ArrayList<>();
        for (Product p : products) {
            SaleItem item = new SaleItem();
            item.setSale(sale);
            item.setProduct(p);
            item.setQuantity(1);
            item.setUnitPrice(p.getPrice());
            item.setSubtotal(p.getPrice());
            total = total.add(p.getPrice());
            items.add(item);
        }
        sale.setItems(items);
        sale.setTotalAmount(total);
        sale.setPaymentAmountInCurrency(total);
        saleRepository.save(sale);
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

    private void createManager(String username, String password, String companyName, SubscriptionStatus status, Double lat, Double lng, String address) {
        if (!userRepository.existsByUsername(username)) {
            Company company = companyRepository.findByName(companyName)
                    .orElseGet(() -> {
                        Company c = new Company();
                        c.setName(companyName);
                        c.setSubscriptionStatus(status);
                        c.setDescription("Tienda de demostración para " + username);
                        c.setLatitude(lat);
                        c.setLongitude(lng);
                        c.setAddress(address);
                        // Default mock reputation
                        c.setRating(3.5 + (Math.random() * 1.5)); // Random between 3.5 and 5.0
                        c.setRatingCount(5 + (int)(Math.random() * 50));
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
                    c.setLatitude(7.767); // Demo coordinates already in SC
                    c.setLongitude(-72.224);
                    c.setAddress("Calle Principal, San Cristóbal");
                    c.setRating(4.8);
                    c.setRatingCount(120);
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
                        p.setBrand("Marca " + ((i % 5) + 1));
                        p.setVariant("Presentación " + ((i % 3) + 1));
                        productRepository.save(p);
                    }
                }
            }
        }
    }
}
