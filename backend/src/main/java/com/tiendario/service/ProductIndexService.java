package com.tiendario.service;

import com.tiendario.domain.Product;
import com.tiendario.repository.search.ProductSearchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductIndexService {

    @Autowired(required = false)
    private ProductSearchRepository productSearchRepository;

    public void indexProduct(Product product) {
        if (productSearchRepository != null) {
            try {
                productSearchRepository.save(product);
            } catch (Exception e) {
                // Elasticsearch might not be running, log but don't fail
                System.err.println("Warning: Could not index product in Elasticsearch: " + e.getMessage());
            }
        }
    }

    public void deleteProductIndex(Long id) {
        if (productSearchRepository != null) {
            try {
                productSearchRepository.deleteById(id);
            } catch (Exception e) {
                System.err.println("Warning: Could not delete product from Elasticsearch: " + e.getMessage());
            }
        }
    }

    public List<Product> searchProducts(String query) {
        if (productSearchRepository != null) {
            try {
                return productSearchRepository.findByNameContainingOrDescriptionContaining(query, query);
            } catch (Exception e) {
                System.err.println("Warning: Elasticsearch search failed: " + e.getMessage());
                return List.of();
            }
        }
        return List.of();
    }

    @Autowired
    com.tiendario.repository.ProductRepository productRepository;

    public void reindexCompanyProducts(Long companyId) {
        if (productSearchRepository != null) {
            try {
                // Fetch all products for this company
                List<Product> products = productRepository.findByCompanyId(companyId);

                // Save them all to Elasticsearch (simulating bulk update)
                for (Product product : products) {
                    productSearchRepository.save(product);
                }
                System.out.println("Re-indexed " + products.size() + " products for company " + companyId);
            } catch (Exception e) {
                System.err.println(
                        "Warning: Could not re-index products for company " + companyId + ": " + e.getMessage());
            }
        }
    }
}
