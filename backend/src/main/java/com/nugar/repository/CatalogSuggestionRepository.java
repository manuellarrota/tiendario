package com.nugar.repository;

import com.nugar.domain.CatalogSuggestion;
import com.nugar.domain.SuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CatalogSuggestionRepository extends JpaRepository<CatalogSuggestion, Long> {
    List<CatalogSuggestion> findByStatus(SuggestionStatus status);
}
