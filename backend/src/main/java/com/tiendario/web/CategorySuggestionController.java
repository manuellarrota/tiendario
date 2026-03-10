package com.tiendario.web;

import com.tiendario.domain.Category;
import com.tiendario.domain.CategorySuggestion;
import com.tiendario.domain.SuggestionStatus;
import com.tiendario.domain.User;
import com.tiendario.domain.Product;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CategoryRepository;
import com.tiendario.repository.CategorySuggestionRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/category-suggestions")
public class CategorySuggestionController {

    @Autowired
    private CategorySuggestionRepository suggestionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    // Any MANAGER can suggest a category
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> suggestCategory(@RequestBody Map<String, String> payload, Authentication authentication) {
        String name = payload.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: El nombre es obligatorio."));
        }

        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null || user.getCompany() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Usuario sin tienda."));
        }

        // Check if category already exists
        if (categoryRepository.findFirstByNameIgnoreCase(name.trim()).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: La categoría ya existe en el sistema."));
        }

        CategorySuggestion suggestion = new CategorySuggestion();
        suggestion.setStoreId(user.getCompany().getId());
        suggestion.setName(name.trim());
        suggestion.setStatus(SuggestionStatus.PENDING);
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(suggestion);
    }

    // Admins see all. Managers see their own.
    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> getSuggestions(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Usuario no encontrado."));
        }

        if (user.getRole().name().equals("ROLE_ADMIN")) {
            return ResponseEntity.ok(suggestionRepository.findAll());
        } else {
            if (user.getCompany() == null) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Usuario sin tienda."));
            }
            return ResponseEntity.ok(suggestionRepository.findByStoreId(user.getCompany().getId()));
        }
    }

    // Admins only: Approve suggestion -> creates a new Category
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveSuggestion(@PathVariable Long id) {
        CategorySuggestion suggestion = suggestionRepository.findById(id).orElse(null);
        if (suggestion == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Sugerencia no encontrada."));
        }

        if (suggestion.getStatus() != SuggestionStatus.PENDING) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: La sugerencia ya no está pendiente."));
        }

        // Create the global category
        if (!categoryRepository.findFirstByNameIgnoreCase(suggestion.getName()).isPresent()) {
            Category newCategory = new Category();
            newCategory.setName(suggestion.getName());
            categoryRepository.save(newCategory);
        }

        suggestion.setStatus(SuggestionStatus.APPROVED);
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse("Sugerencia aprobada exitosamente y categoría creada."));
    }

    // Admins only: Reject suggestion
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectSuggestion(@PathVariable Long id) {
        CategorySuggestion suggestion = suggestionRepository.findById(id).orElse(null);
        if (suggestion == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Sugerencia no encontrada."));
        }

        suggestion.setStatus(SuggestionStatus.REJECTED);
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse("Sugerencia rechazada."));
    }

    // Admins only: Merge suggestion -> update products and reject the suggestion
    // visually or mark as merged/approved
    @PutMapping("/{id}/merge")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> mergeSuggestion(@PathVariable Long id, @RequestBody Map<String, Long> payload) {
        Long targetCategoryId = payload.get("targetCategoryId");
        if (targetCategoryId == null) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: ID de la categoría destino es obligatorio."));
        }

        CategorySuggestion suggestion = suggestionRepository.findById(id).orElse(null);
        if (suggestion == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Sugerencia no encontrada."));
        }

        Category targetCategory = categoryRepository.findById(targetCategoryId).orElse(null);
        if (targetCategory == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Categoría destino no encontrada."));
        }

        // Update all products in this company that use the suggestion name to the
        // target category name
        List<Product> productsToUpdate = productRepository.findByCompanyId(suggestion.getStoreId());
        // To be safe, update only products of that store having the suggested category
        // name
        for (Product product : productsToUpdate) {
            if (suggestion.getName().equalsIgnoreCase(product.getCategory())) {
                product.setCategory(targetCategory.getName());
                productRepository.save(product);
            }
        }

        // Mark suggestion as approved (meaning it was handled) or add a new MIX state,
        // but let's just mark it APPROVED or a new MERGED status
        suggestion.setStatus(SuggestionStatus.APPROVED);
        suggestion.setName(suggestion.getName() + " -> " + targetCategory.getName()); // Just for UI clarity if needed
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse(
                "Sugerencia fusionada exitosamente. Se actualizaron los productos correspondientes."));
    }
}
