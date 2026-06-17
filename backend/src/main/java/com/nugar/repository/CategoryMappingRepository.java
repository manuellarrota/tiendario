package com.nugar.repository;

import com.nugar.domain.CategoryMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryMappingRepository extends JpaRepository<CategoryMapping, Long> {
    Optional<CategoryMapping> findByLocalCategoryNameIgnoreCase(String localCategoryName);
    List<CategoryMapping> findByGlobalCategoryId(Long globalCategoryId);
}
