package com.tiendario.repository;

import com.tiendario.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByCompanyId(Long companyId);

    java.util.Optional<Category> findByNameAndCompanyId(String name, Long companyId);
}
