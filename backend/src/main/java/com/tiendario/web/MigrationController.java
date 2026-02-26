package com.tiendario.web;

import com.tiendario.domain.Product;
import com.tiendario.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    @Autowired
    private ProductRepository productRepository;

    @PostMapping("/assign-categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignCategoriesToProducts() {
        List<Product> products = productRepository.findAll();
        int updated = 0;

        for (Product product : products) {
            if (product.getCategory() == null && product.getCompany() != null) {
                String categoryName = inferCategoryFromName(product.getName());
                product.setCategory(categoryName);
                productRepository.save(product);
                updated++;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Categories assigned successfully");
        response.put("productsUpdated", updated);
        response.put("totalProducts", products.size());

        return ResponseEntity.ok(response);
    }

    private String inferCategoryFromName(String productName) {
        String name = productName.toLowerCase();

        // Alimentos
        if (name.contains("arroz") || name.contains("pan") || name.contains("leche") ||
                name.contains("aceite") || name.contains("azúcar") || name.contains("café") ||
                name.contains("harina") || name.contains("pasta") || name.contains("cereal")) {
            return "Alimentos";
        }

        // Ropa y calzado
        if (name.contains("zapatilla") || name.contains("camisa") || name.contains("pantalón") ||
                name.contains("gorra") || name.contains("camiseta") || name.contains("jean") ||
                name.contains("zapato") || name.contains("blusa")) {
            return "Ropa";
        }

        // Tecnología
        if (name.contains("reloj") || name.contains("auricular") || name.contains("cable") ||
                name.contains("cargador") || name.contains("mouse") || name.contains("teclado") ||
                name.contains("laptop") || name.contains("celular")) {
            return "Tecnología";
        }

        // Deportes
        if (name.contains("nike") || name.contains("adidas") || name.contains("puma") ||
                name.contains("balón") || name.contains("pelota") || name.contains("deporte")) {
            return "Deportes";
        }

        // Default
        return "Otros";
    }
}
