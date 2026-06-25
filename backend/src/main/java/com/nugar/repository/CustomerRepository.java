package com.nugar.repository;

import com.nugar.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByCompanyId(Long companyId);
    org.springframework.data.domain.Page<Customer> findByCompanyId(Long companyId, org.springframework.data.domain.Pageable pageable);
    List<Customer> findByEmailAndCompanyId(String email, Long companyId);
    List<Customer> findByPhoneAndCompanyId(String phone, Long companyId);
    List<Customer> findByEmail(String email);
    List<Customer> findByCedula(String cedula);
    boolean existsByCompanyIdAndCedula(Long companyId, String cedula);

    @org.springframework.data.jpa.repository.Query("SELECT c FROM Customer c WHERE c.company.id = :companyId AND (" +
            "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(c.name), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(c.cedula) LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(c.email) LIKE CONCAT('%', :q, '%') OR " +
            "LOWER(c.phone) LIKE CONCAT('%', :q, '%'))")
    org.springframework.data.domain.Page<Customer> findByCompanyIdAndSearch(@org.springframework.data.repository.query.Param("companyId") Long companyId, @org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable pageable);
}
