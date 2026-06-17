package com.nugar.config;

import com.nugar.domain.*;
import com.nugar.repository.*;
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

    @Autowired
    private GlobalConfigRepository globalConfigRepository;

    @Autowired
    private CatalogProductRepository catalogProductRepository;

    @Autowired
    private com.nugar.service.ExchangeRateService exchangeRateService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            System.err.println("DEBUG: DataInitializer running...");

            // Fix payment_method check constraint to include MIXED (idempotent)
            try {
                jdbcTemplate.execute("ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check");
                jdbcTemplate.execute("ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check " +
                    "CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'MOBILE_PAYMENT', 'MIXED'))");
                System.err.println("✓ sales_payment_method_check constraint updated.");
            } catch (Exception ex) {
                System.err.println("Warning: Could not update payment_method constraint: " + ex.getMessage());
            }
            
            // 0. Ensure Global Config
            ensureGlobalConfig();

            // 2. Ensure Demo Managers & Customers
            createSuperAdmin("admin@nugar.com", "Admin123!");
            createManager("manager_pro@nugar.com",  "Manager123!", "Ferretería Central",    SubscriptionStatus.PAID,  7.789354, -72.219738, "Av. 19 de Abril, San Cristóbal", null);
            createManager("manager_free@nugar.com", "Manager123!", "Minimarket El Rincón",  SubscriptionStatus.TRIAL, 7.792100, -72.215400, "Calle 5, Barrio Obrero, San Cristóbal", 8);
            //createCashier("cajero_pro@nugar.com",   "Cajero123!",  "Ferretería Central");
            //reateCustomer("cliente@nugar.com", "Cliente123!");


            // 3. Seed requested categories
            seedBaseCategories();

            // 4. Seed 100 products per category
            //seedDemoProducts();

            // 5. Seed detailed data for manager_pro
            seedManagerProData();

            // 6. Automatically synchronize products to Global Catalog
            syncGlobalCatalog();

            System.err.println("✓ Initialization complete. Base categories, Demo Products, Global Catalog and Super Admin ready.");

        } catch (Exception e) {
            System.err.println("ERROR during DataInitializer execution:");
            e.printStackTrace();
        }
    }

    private void syncGlobalCatalog() {
        System.err.println("Synchronizing Global Catalog...");
        List<Product> allProducts = productRepository.findAll();
        int created = 0;
        int skipped = 0;
        for (Product p : allProducts) {
            if (p.getSku() == null || p.getSku().trim().isEmpty()) { skipped++; continue; }
            String sku = p.getSku().trim();
            if (catalogProductRepository.findBySku(sku).isPresent()) { skipped++; continue; }
            CatalogProduct cp = new CatalogProduct();
            cp.setSku(sku);
            cp.setName(p.getName());
            cp.setDescription(p.getDescription());
            cp.setImageUrl(p.getImageUrl());
            if (p.getCategory() != null) {
                Category cat = categoryRepository.findFirstByNameIgnoreCase(p.getCategory().trim()).orElse(null);
                cp.setCategory(cat);
            }
            catalogProductRepository.save(cp);
            created++;
        }
        System.err.println("✓ Global Catalog Synchronized: " + created + " created, " + skipped + " skipped.");
    }

    private void seedManagerProData() {
        Optional<User> managerOpt = userRepository.findByUsername("manager_pro@nugar.com");
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

                List<Product> allCompanyProducts = new java.util.ArrayList<>(List.of(p1, p2, p3, p4, p5, p6));

                // 2.1 Generate 1000 additional products for Ferretería Central
                System.err.println("Seeding 1000 additional products for Ferretería Central...");
                String[] prefixes = {"Llave", "Tornillo", "Tuerca", "Martillo", "Destornillador", "Alicate", "Cinta", "Broca", "Pintura", "Clavo", "Sierra", "Tubo", "Codo", "Lija", "Pegamento"};
                String[] brands = {"Truper", "Stanley", "Bosch", "DeWalt", "Makita", "Cisa", "3M", "Sika", "Pretul"};
                for (int i = 1; i <= 1000; i++) {
                    String prefix = prefixes[i % prefixes.length];
                    String brand = brands[i % brands.length];
                    double cost = 1.0 + (i % 50);
                    double price = cost * 1.5;
                    Product gp = createProduct(company, prefix + " Industrial " + i, "Ferretería", "ST-1" + String.format("%04d", i), price, cost, 50, "Standard", brand);
                    allCompanyProducts.add(gp);
                }

                // 3. Create Purchases (Stock entry - More variety for reports)
                System.err.println("Generating historical multi-currency purchases (180 days) for " + manager.getUsername() + "...");
                java.util.Random rnd = new java.util.Random();
                for (int i = 1; i <= 40; i++) {
                    java.time.LocalDateTime purchDate = java.time.LocalDateTime.now().minusDays(rnd.nextInt(180)).minusHours(rnd.nextInt(24));
                    Supplier randomSup = rnd.nextBoolean() ? sup1 : sup2;
                    String currency = rnd.nextBoolean() ? "USD" : "VES";
                    double rate = currency.equals("USD") ? 1.0 : 36.0 + (rnd.nextDouble() * 1.5);
                    PaymentMethod[] methods = {PaymentMethod.CASH, PaymentMethod.MOBILE_PAYMENT, PaymentMethod.TRANSFER, PaymentMethod.CARD};
                    PaymentMethod randomMethod = methods[rnd.nextInt(methods.length)];

                    List<Product> purchProducts = new java.util.ArrayList<>();
                    int itemsCount = 2 + rnd.nextInt(8);
                    for (int j = 0; j < itemsCount; j++) {
                        purchProducts.add(allCompanyProducts.get(rnd.nextInt(allCompanyProducts.size())));
                    }
                    createPurchase(company, randomSup, purchProducts, purchDate, "INV-HIST-" + i, currency, rate, randomMethod);
                }

                // 4. Create Sales (Diverse states and history)
                System.err.println("Generating historical sales for charting (Mixed Currencies)...");
                // 4. Create Sales (Diverse states and history)
                System.err.println("Generating 300 historical sales for charting (180 days span)...");
                PaymentMethod[] methods = {PaymentMethod.CASH, PaymentMethod.MOBILE_PAYMENT, PaymentMethod.TRANSFER, PaymentMethod.CARD};
                SaleStatus[] statuses = {SaleStatus.PAID, SaleStatus.PAID, SaleStatus.PAID, SaleStatus.PAID, SaleStatus.PAID, SaleStatus.PENDING, SaleStatus.PARTIAL_REFUND}; // Mostly paid
                String[] names = {"Juan Pérez", "María García", "Luis Rodríguez", "Ana Martínez", "Carlos Ruiz", "Elena Blanco", "Pedro Sánchez", "Santi Castro", "Cliente Especial"};

                for (int i = 1; i <= 300; i++) {
                    // Skew sales more towards recent days for realistic growth curves
                    int daysAgo = (int) (Math.pow(rnd.nextDouble(), 1.5) * 180);
                    java.time.LocalDateTime saleDate = java.time.LocalDateTime.now().minusDays(daysAgo).minusHours(rnd.nextInt(24));
                    SaleStatus randomStatus = statuses[rnd.nextInt(statuses.length)];
                    PaymentMethod randomMethod = methods[rnd.nextInt(methods.length)];
                    String randomName = names[rnd.nextInt(names.length)];
                    
                    String currency = (rnd.nextBoolean()) ? "USD" : "VES";
                    double rate = currency.equals("USD") ? 1.0 : 36.0 + (rnd.nextDouble() * 1.5);

                    List<Product> saleProducts = new java.util.ArrayList<>();
                    int itemsCount = 1 + rnd.nextInt(5);
                    for (int j = 0; j < itemsCount; j++) {
                        saleProducts.add(allCompanyProducts.get(rnd.nextInt(allCompanyProducts.size())));
                    }

                    createSale(company, manager, randomName, saleProducts, randomStatus, randomMethod, saleDate, currency, rate);
                }
                
                System.err.println("✓ Manager Pro data seeded successfully with 300 historical sales and 40 purchases spanning 6 months.");
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

    private void createPurchase(Company company, Supplier supplier, List<Product> products, java.time.LocalDateTime date, String invoice, String currency, double rate, PaymentMethod method) {
        Purchase purchase = new Purchase();
        purchase.setCompany(company);
        purchase.setSupplier(supplier);
        purchase.setDate(date);
        purchase.setInvoiceNumber(invoice);
        purchase.setCurrencyCode(currency);
        purchase.setExchangeRate(BigDecimal.valueOf(rate));
        purchase.setPaymentMethod(method);
        
        BigDecimal total = BigDecimal.ZERO;
        List<PurchaseItem> items = new java.util.ArrayList<>();
        for (Product p : products) {
            PurchaseItem item = new PurchaseItem();
            item.setPurchase(purchase);
            item.setProduct(p);
            item.setQuantity(10);
            
            // Set cost in the purchase currency
            BigDecimal unitCost = p.getCostPrice().multiply(BigDecimal.valueOf(rate));
            item.setUnitCost(unitCost);
            item.setUnitCostInBaseCurrency(p.getCostPrice());
            
            BigDecimal subtotal = unitCost.multiply(BigDecimal.valueOf(10));
            total = total.add(subtotal);
            
            item.setSubtotalInBaseCurrency(p.getCostPrice().multiply(BigDecimal.valueOf(10)));
            items.add(item);

            // Update product stock
            p.setStock(p.getStock() + 10);
            productRepository.save(p);
        }
        purchase.setItems(items);
        purchase.setTotal(total);
        purchase.setTotalInBaseCurrency(total.divide(BigDecimal.valueOf(rate), 2, java.math.RoundingMode.HALF_UP));
        purchaseRepository.save(purchase);
    }

    private void ensureGlobalConfig() {
        if (globalConfigRepository.count() == 0) {
            GlobalConfig config = new GlobalConfig();
            globalConfigRepository.save(config);
            System.err.println("✓ Created default GlobalConfig.");
        }
        
        // Trigger rate update on every startup
        try {
            exchangeRateService.updateRates();
            System.err.println("✓ Exchange rates updated on startup.");
        } catch (Exception e) {
            System.err.println("Warning: Could not fetch initial rates on startup: " + e.getMessage());
        }
    }

    private void createSale(Company company, User user, String customerName, List<Product> products, SaleStatus status, PaymentMethod method, java.time.LocalDateTime date, String currency, double rate) {
        Sale sale = new Sale();
        sale.setCompany(company);
        sale.setUser(user);
        sale.setCustomerName(customerName);
        sale.setStatus(status);
        sale.setPaymentMethod(method);
        sale.setDate(date);
        sale.setPaymentCurrency(currency);
        sale.setExchangeRateUsed(BigDecimal.valueOf(rate));

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

            // Update stock
            if (p.getStock() > 0) {
                p.setStock(p.getStock() - 1);
                productRepository.save(p);
            }
        }
        sale.setItems(items);
        sale.setTotalAmount(total);
        
        // Convert total to payment currency
        BigDecimal totalInCurrency = total.multiply(BigDecimal.valueOf(rate));
        sale.setPaymentAmountInCurrency(totalInCurrency);

        // Create formal SalePayment record
        SalePayment payment = new SalePayment();
        payment.setSale(sale);
        payment.setMethod(method);
        payment.setAmount(totalInCurrency);
        payment.setCurrencyCode(currency);
        payment.setExchangeRate(BigDecimal.valueOf(rate));
        payment.setAmountInBaseCurrency(total);
        
        sale.setPayments(java.util.List.of(payment));
        
        saleRepository.save(sale);
    }

    private void createSuperAdmin(String username, String password) {
        if (!userRepository.existsByUsername(username)) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.getRoles().add(Role.ROLE_ADMIN);
            user.setEnabled(true);
            user.setEmail(username);
            userRepository.save(user);
            System.err.println("✓ Created Super Admin user: " + username);
        }
    }

    private void createManager(String username, String password, String companyName, SubscriptionStatus status, Double lat, Double lng, String address, Integer trialDaysLeft) {
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
                        
                        if (status == SubscriptionStatus.TRIAL && trialDaysLeft != null) {
                            c.setTrialStartDate(java.time.LocalDateTime.now().minusDays(30 - trialDaysLeft));
                            c.setSubscriptionEndDate(java.time.LocalDateTime.now().plusDays(trialDaysLeft));
                        }
                        
                        // Default mock reputation
                        c.setRating(3.5 + (Math.random() * 1.5)); // Random between 3.5 and 5.0
                        c.setRatingCount(5 + (int)(Math.random() * 50));
                        return companyRepository.save(c);
                    });

            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.getRoles().add(Role.ROLE_MANAGER);
            user.setEnabled(true);
            user.setEmail(username);
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
            user.getRoles().add(Role.ROLE_CLIENT);
            user.setEnabled(true);
            user.setEmail(username);
            user.setPoints(100); // Start with some demo points
            userRepository.save(user);
            System.err.println("✓ Created Customer user: " + username);
        }
    }

    private void createCashier(String username, String password, String companyName) {
        if (!userRepository.existsByUsername(username)) {
            Company company = companyRepository.findByName(companyName)
                    .orElseThrow(() -> new RuntimeException("Company not found: " + companyName));

            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.getRoles().add(Role.ROLE_CASHIER);
            user.setEnabled(true);
            user.setEmail(username);
            user.setCompany(company);
            userRepository.save(user);
            System.err.println("✓ Created Cashier user: " + username + " for company: " + companyName);
        }
    }

    private void seedBaseCategories() {
        String[][] baseCategories = {
                {"Restaurante", "Encuentra los mejores restaurantes locales. Disfruta de comida deliciosa, desde almuerzos ejecutivos hasta cenas gourmet cerca de ti."},
                {"Cafetería", "Descubre las mejores cafeterías de la zona. Disfruta de un excelente café, postres y desayunos para empezar el día con energía."},
                {"Panadería", "Pan fresco, cachitos, cruasanes y más. Localiza las mejores panaderías cerca de tu ubicación para tus desayunos y meriendas."},
                {"Pastelería", "Tortas, dulces y postres para cualquier ocasión. Encuentra pastelerías locales con las mejores creaciones dulces."},
                {"Heladería", "Refréscate con los mejores helados artesanales y comerciales. Explora las heladerías más cercanas a tu ubicación."},
                {"Mini market / Bodega", "Compra víveres, snacks, bebidas y artículos de primera necesidad rápidamente en minimarkets y bodegas locales."},
                {"Supermercado", "Haz tu mercado completo. Encuentra víveres, productos de limpieza, cuidado personal y alimentos frescos al mejor precio."},
                {"Carnicería", "Carnes frescas, pollo, cerdo y cortes especiales. Encuentra las mejores carnicerías locales con productos de alta calidad."},
                {"Pescadería", "Pescados y mariscos frescos traídos directamente del mar. Localiza pescaderías cerca de ti con productos frescos y saludables."},
                {"Frutería / Verdulería", "Frutas y verduras frescas, directamente del campo a tu mesa. Consigue los mejores precios en mercados y fruterías de tu zona."},
                {"Farmacia", "Medicamentos, productos de cuidado personal y primeros auxilios. Encuentra farmacias locales abiertas y con stock disponible."},
                {"Ferretería", "Herramientas, materiales de construcción y artículos para reparaciones del hogar. Todo lo que necesitas para tus proyectos de ferretería."},
                {"Tienda de ropa", "Moda para toda la familia. Descubre tiendas de ropa locales con las últimas tendencias en prendas para damas, caballeros y niños."},
                {"Zapatería", "Calzado cómodo y a la moda. Encuentra zapatos, deportivos y formales en las mejores zapaterías cercanas a tu ubicación."},
                {"Electrónica / celulares", "Teléfonos móviles, accesorios, computadoras y gadgets. Explora tiendas de tecnología y electrónica con lo último del mercado."},
                {"Tienda de mascotas", "Alimento, accesorios y cuidado para tus mascotas. Todo lo que tu perro, gato u otra mascota necesita en tiendas locales."},
                {"Licorería", "Encuentra tus licores, cervezas y bebidas favoritas para tus celebraciones. Descubre licorerías cercanas con gran variedad."},
                {"Floristería", "Arreglos florales, ramos y detalles para ocasiones especiales. Encuentra la floristería perfecta cerca de ti para sorprender."},
                {"Tienda de regalos / variedades", "Regalos, juguetes, papelería y detalles únicos. Explora tiendas de variedades locales con opciones para cualquier evento."},
                {"Papelería", "Artículos escolares, de oficina y papelería en general. Encuentra cuadernos, lápices y materiales de trabajo cerca de ti."}
        };

        for (String[] catData : baseCategories) {
            String catName = catData[0];
            String catDesc = catData[1];
            Optional<Category> catOpt = categoryRepository.findFirstByNameIgnoreCase(catName);
            if (!catOpt.isPresent()) {
                Category cat = new Category();
                cat.setName(catName);
                cat.setDescription(catDesc);
                categoryRepository.save(cat);
                System.err.println("✓ Created category: " + catName);
            } else {
                Category cat = catOpt.get();
                if (cat.getDescription() == null || cat.getDescription().trim().isEmpty()) {
                    cat.setDescription(catDesc);
                    categoryRepository.save(cat);
                    System.err.println("✓ Updated category description for SEO: " + catName);
                }
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
