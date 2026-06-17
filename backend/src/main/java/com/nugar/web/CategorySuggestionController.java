package com.nugar.web;

import com.nugar.domain.Category;
import com.nugar.domain.CategorySuggestion;
import com.nugar.domain.SuggestionStatus;
import com.nugar.domain.User;
import com.nugar.domain.Product;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CategoryRepository;
import com.nugar.repository.CategorySuggestionRepository;
import com.nugar.repository.CategoryMappingRepository;
import com.nugar.repository.ProductRepository;
import com.nugar.repository.UserRepository;
import com.nugar.domain.CategoryMapping;
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
    private CategoryMappingRepository categoryMappingRepository;

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

        if (user.getRoles().contains(com.nugar.domain.Role.ROLE_ADMIN)) {
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

        // Create mapping instead of renaming products
        if (!categoryMappingRepository.findByLocalCategoryNameIgnoreCase(suggestion.getName()).isPresent()) {
            CategoryMapping mapping = new CategoryMapping();
            mapping.setLocalCategoryName(suggestion.getName());
            mapping.setGlobalCategory(targetCategory);
            categoryMappingRepository.save(mapping);
        }

        // Mark suggestion as approved (meaning it was mapped)
        suggestion.setStatus(SuggestionStatus.APPROVED);
        suggestion.setName(suggestion.getName() + " -> " + targetCategory.getName()); // Just for UI clarity if needed
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse(
                "Sugerencia mapeada exitosamente a la categoría global seleccionada."));
    }
}
