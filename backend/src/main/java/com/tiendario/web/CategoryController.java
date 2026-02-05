package com.tiendario.web;

import com.tiendario.domain.Category;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CategoryRepository;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
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
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return categoryRepository.findByCompanyId(userDetails.getCompanyId());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createCategory(@RequestBody Category category) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        category.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        categoryRepository.save(category);

        return ResponseEntity.ok(new MessageResponse("Category created successfully!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || !category.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Category not found or access denied."));
        }

        categoryRepository.delete(category);
        return ResponseEntity.ok(new MessageResponse("Category deleted successfully!"));
    }
}
