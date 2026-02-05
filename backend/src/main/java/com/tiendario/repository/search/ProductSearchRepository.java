package com.tiendario.repository.search;

import com.tiendario.domain.Product;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductSearchRepository extends ElasticsearchRepository<Product, Long> {
    List<Product> findByNameContainingOrDescriptionContaining(String name, String description);

    List<Product> findByNameContaining(String name);
}
