package com.tiendario.repository;

import com.tiendario.domain.CategorySuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategorySuggestionRepository extends JpaRepository<CategorySuggestion, Long> {
    List<CategorySuggestion> findByStoreId(Long storeId);
}
