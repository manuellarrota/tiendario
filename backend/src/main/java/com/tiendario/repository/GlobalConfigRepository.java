package com.tiendario.repository;

import com.tiendario.domain.GlobalConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GlobalConfigRepository extends JpaRepository<GlobalConfig, Long> {
    // We only ever have one config record
    Optional<GlobalConfig> findFirstByOrderByIdAsc();
}
