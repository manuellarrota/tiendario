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

            // 1. Ensure Super Admin
            createSuperAdmin("admin@nugar.com", "Admin123!");

            // 2. Seed base categories
            seedBaseCategories();

            System.err.println("✓ Initialization complete. Base categories, Global Config, and Super Admin ready.");

        } catch (Exception e) {
            System.err.println("ERROR during DataInitializer execution:");
            e.printStackTrace();
        }
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

    private void seedBaseCategories() {
        String[][] baseCategories = {
                { "Restaurante",
                        "Encuentra los mejores restaurantes locales. Disfruta de comida deliciosa, desde almuerzos ejecutivos hasta cenas gourmet cerca de ti.",
                        "/assets/categories/restaurante.png" },
                { "Cafetería",
                        "Descubre las mejores cafeterías de la zona. Disfruta de un excelente café, postres y desayunos para empezar el día con energía.",
                        "/assets/categories/cafeteria.png" },
                { "Panadería",
                        "Pan fresco, cachitos, cruasanes y más. Localiza las mejores panaderías cerca de tu ubicación para tus desayunos y meriendas.",
                        "/assets/categories/panaderia.png" },
                { "Pastelería",
                        "Tortas, dulces y postres para cualquier ocasión. Encuentra pastelerías locales con las mejores creaciones dulces.",
                        "/assets/categories/pasteleria.png" },
                { "Heladería",
                        "Refréscate con los mejores helados artesanales y comerciales. Explora las heladerías más cercanas a tu ubicación.",
                        "/assets/categories/heladeria.png" },
                { "Mini market / Bodega",
                        "Compra víveres, snacks, bebidas y artículos de primera necesidad rápidamente en minimarkets y bodegas locales.",
                        "/assets/categories/bodega.png" },
                { "Supermercado",
                        "Haz tu mercado completo. Encuentra víveres, productos de limpieza, cuidado personal y alimentos frescos al mejor precio.",
                        "/assets/categories/supermercado.png" },
                { "Carnicería",
                        "Carnes frescas, pollo, cerdo y cortes especiales. Encuentra las mejores carnicerías locales con productos de alta calidad.",
                        "/assets/categories/carniceria.png" },
                { "Pescadería",
                        "Pescados y mariscos frescos traídos directamente del mar. Localiza pescaderías cerca de ti con productos frescos y saludables.",
                        "/assets/categories/pescaderia.png" },
                { "Frutería / Verdulería",
                        "Frutas y verduras frescas, directamente del campo a tu mesa. Consigue los mejores precios en mercados y fruterías de tu zona.",
                        "/assets/categories/fruteria.png" },
                { "Farmacia",
                        "Medicamentos, productos de cuidado personal y primeros auxilios. Encuentra farmacias locales abiertas y con stock disponible.",
                        "/assets/categories/farmacia.png" },
                { "Ferretería",
                        "Herramientas, materiales de construcción y artículos para reparaciones del hogar. Todo lo que necesitas para tus proyectos de ferretería.",
                        "/assets/categories/ferreteria.png" },
                { "Tienda de ropa",
                        "Moda para toda la familia. Descubre tiendas de ropa locales con las últimas tendencias en prendas para damas, caballeros y niños.",
                        "/assets/categories/ropa.png" },
                { "Zapatería",
                        "Calzado cómodo y a la moda. Encuentra zapatos, deportivos y formales en las mejores zapaterías cercanas a tu ubicación.",
                        "/assets/categories/zapateria.png" },
                { "Electrónica / celulares",
                        "Teléfonos móviles, accesorios, computadoras y gadgets. Explora tiendas de tecnología y electrónica con lo último del mercado.",
                        "/assets/categories/electronica.png" },
                { "Tienda de mascotas",
                        "Alimento, accesorios y cuidado para tus mascotas. Todo lo que tu perro, gato u otra mascota necesita en tiendas locales.",
                        "/assets/categories/mascotas.png" },
                { "Licorería",
                        "Encuentra tus licores, cervezas y bebidas favoritas para tus celebraciones. Descubre licorerías cercanas con gran variedad.",
                        "/assets/categories/licoreria.png" },
                { "Floristería",
                        "Arreglos florales, ramos y detalles para ocasiones especiales. Encuentra la floristería perfecta cerca de ti para sorprender.",
                        "/assets/categories/floristeria.png" },
                { "Tienda de regalos / variedades",
                        "Regalos, juguetes, papelería y detalles únicos. Explora tiendas de variedades locales con opciones para cualquier evento.",
                        "/assets/categories/regalos.png" },
                { "Papelería",
                        "Artículos escolares, de oficina y papelería en general. Encuentra cuadernos, lápices y materiales de trabajo cerca de ti.",
                        "/assets/categories/libreria.png" }
        };

        for (String[] catData : baseCategories) {
            String catName = catData[0];
            String catDesc = catData[1];
            String catImageUrl = catData[2];
            Optional<Category> catOpt = categoryRepository.findFirstByNameIgnoreCase(catName);
            if (!catOpt.isPresent()) {
                Category cat = new Category();
                cat.setName(catName);
                cat.setDescription(catDesc);
                cat.setImageUrl(catImageUrl);
                categoryRepository.save(cat);
                System.err.println("✓ Created category: " + catName);
            } else {
                Category cat = catOpt.get();
                boolean updated = false;

                if (cat.getDescription() == null || cat.getDescription().trim().isEmpty()) {
                    cat.setDescription(catDesc);
                    updated = true;
                }

                if (cat.getImageUrl() == null && catImageUrl != null) {
                    cat.setImageUrl(catImageUrl);
                    updated = true;
                }

                if (updated) {
                    categoryRepository.save(cat);
                    System.err.println("✓ Updated category for SEO/Images: " + catName);
                }
            }
        }
    }
}
