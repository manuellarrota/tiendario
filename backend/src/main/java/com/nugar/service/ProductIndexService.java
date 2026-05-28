package com.nugar.service;

import com.nugar.domain.Product;
import com.nugar.repository.search.ProductSearchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductIndexService {

    private static final Logger log = LoggerFactory.getLogger(ProductIndexService.class);

    @Autowired(required = false)
    private ProductSearchRepository productSearchRepository;

    public void indexProduct(Product product) {
        if (productSearchRepository != null) {
            try {
                productSearchRepository.save(product);
            } catch (Exception e) {
                log.warn("[ELASTICSEARCH] Could not index product in Elasticsearch: {}", e.getMessage());
            }
        }
    }

    public void deleteProductIndex(Long id) {
        if (productSearchRepository != null) {
            try {
                productSearchRepository.deleteById(id);
            } catch (Exception e) {
                log.warn("[ELASTICSEARCH] Could not delete product from Elasticsearch: {}", e.getMessage());
            }
        }
    }

    public List<Product> searchProducts(String query) {
        String normalizedQuery = com.nugar.util.SearchUtils.normalize(query);
        if (productSearchRepository != null) {
            try {
                return productSearchRepository.findByNameContainingOrDescriptionContaining(normalizedQuery, normalizedQuery);
            } catch (Exception e) {
                log.warn("[ELASTICSEARCH] Elasticsearch search failed: {}", e.getMessage());
            }
        }
        
        // Fallback to database
        if (productRepository != null) {
            return productRepository.searchAllProducts(normalizedQuery);
        }
        return List.of();
    }

    @Autowired
    com.nugar.repository.ProductRepository productRepository;

    public void reindexCompanyProducts(Long companyId) {
        if (productSearchRepository != null) {
            try {
                // Fetch all products for this company
                List<Product> products = productRepository.findByCompanyId(companyId);

                // Save them all to Elasticsearch (simulating bulk update)
                for (Product product : products) {
                    productSearchRepository.save(product);
                }
                log.info("[ELASTICSEARCH] Re-indexed {} products for company {}", products.size(), companyId);
            } catch (Exception e) {
                log.warn("[ELASTICSEARCH] Could not re-index products for company {}: {}", companyId, e.getMessage());
            }
        }
    }
}
