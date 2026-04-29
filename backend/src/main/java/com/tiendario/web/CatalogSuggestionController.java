package com.tiendario.web;

import com.tiendario.domain.CatalogProduct;
import com.tiendario.domain.CatalogSuggestion;
import com.tiendario.domain.Product;
import com.tiendario.domain.SuggestionStatus;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CatalogProductRepository;
import com.tiendario.repository.CatalogSuggestionRepository;
import com.tiendario.repository.ProductRepository;
import com.tiendario.service.ProductIndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/superadmin/catalog-suggestions")
public class CatalogSuggestionController {

    @Autowired
    private CatalogSuggestionRepository suggestionRepository;

    @Autowired
    private CatalogProductRepository catalogProductRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductIndexService productIndexService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPendingSuggestions() {
        return ResponseEntity.ok(suggestionRepository.findByStatus(SuggestionStatus.PENDING));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> approveSuggestion(@PathVariable Long id) {
        CatalogSuggestion suggestion = suggestionRepository.findById(id).orElse(null);
        if (suggestion == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Sugerencia no encontrada"));
        }

        if (suggestion.getStatus() != SuggestionStatus.PENDING) {
            return ResponseEntity.badRequest().body(new MessageResponse("La sugerencia no está pendiente."));
        }

        CatalogProduct catalogProduct = suggestion.getCatalogProduct();
        if (catalogProduct != null) {
            catalogProduct.setName(suggestion.getSuggestedName());
            catalogProduct.setDescription(suggestion.getSuggestedDescription());
            catalogProduct.setImageUrl(suggestion.getSuggestedImageUrl());
            catalogProductRepository.save(catalogProduct);

            // Re-index products that belong to this catalog product so the marketplace shows updated info
            List<Product> products = productRepository.findByCatalogProduct(catalogProduct);
            for (Product p : products) {
                productIndexService.indexProduct(p);
            }
        }

        suggestion.setStatus(SuggestionStatus.APPROVED);
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse("Sugerencia de catálogo aprobada exitosamente."));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectSuggestion(@PathVariable Long id) {
        CatalogSuggestion suggestion = suggestionRepository.findById(id).orElse(null);
        if (suggestion == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Sugerencia no encontrada"));
        }

        suggestion.setStatus(SuggestionStatus.REJECTED);
        suggestionRepository.save(suggestion);

        return ResponseEntity.ok(new MessageResponse("Sugerencia rechazada."));
    }
}
