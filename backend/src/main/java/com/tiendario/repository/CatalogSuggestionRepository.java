package com.tiendario.repository;

import com.tiendario.domain.CatalogSuggestion;
import com.tiendario.domain.SuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CatalogSuggestionRepository extends JpaRepository<CatalogSuggestion, Long> {
    List<CatalogSuggestion> findByStatus(SuggestionStatus status);
}
