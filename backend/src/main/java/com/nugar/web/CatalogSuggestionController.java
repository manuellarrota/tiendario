package com.nugar.web;

import com.nugar.domain.CatalogProduct;
import com.nugar.domain.CatalogSuggestion;
import com.nugar.domain.Product;
import com.nugar.domain.SuggestionStatus;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CatalogProductRepository;
import com.nugar.repository.CatalogSuggestionRepository;
import com.nugar.repository.ProductRepository;
import com.nugar.service.ProductIndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.nugar.security.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@RestController
@RequestMapping("/api/superadmin/catalog-suggestions")
public class CatalogSuggestionController {
    private static final Logger log = LoggerFactory.getLogger(CatalogSuggestionController.class);

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

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("✅ [CATALOGO APROBADO] SuperAdmin '{}' aprobo sugerencia ID: {} de la empresa '{}' para el producto '{}'",
            userDetails.getUsername(), id, suggestion.getCompanyName(), suggestion.getSuggestedName());

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

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        log.info("❌ [CATALOGO RECHAZADO] SuperAdmin '{}' rechazo sugerencia ID: {} de la empresa '{}' para el producto '{}'",
            userDetails.getUsername(), id, suggestion.getCompanyName(), suggestion.getSuggestedName());

        return ResponseEntity.ok(new MessageResponse("Sugerencia rechazada."));
    }
}
