package com.tiendario.web;

import com.tiendario.domain.Category;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CategoryRepository;
import com.tiendario.repository.CompanyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Category name is required."));
        }

        if (categoryRepository.findFirstByNameIgnoreCase(category.getName().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Category already exists."));
        }

        category.setName(category.getName().trim());
        categoryRepository.save(category);

        return ResponseEntity.ok(new MessageResponse("Category created successfully!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Category not found."));
        }

        categoryRepository.delete(category);
        return ResponseEntity.ok(new MessageResponse("Category deleted globally!"));
    }
}
