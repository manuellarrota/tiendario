package com.tiendario.web;

import com.tiendario.domain.Customer;
import com.tiendario.payload.response.MessageResponse;
import com.tiendario.repository.CompanyRepository;
import com.tiendario.repository.CustomerRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    public List<Customer> getCustomers() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return customerRepository.findByCompanyId(userDetails.getCompanyId());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Check if email already exists for this company
        if (customer.getEmail() != null && !customer.getEmail().isEmpty()) {
            if (customerRepository.findByEmailAndCompanyId(customer.getEmail(), userDetails.getCompanyId())
                    .isPresent()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Email already registered for this company!"));
            }
        }

        customer.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        customerRepository.save(customer);

        return ResponseEntity.ok(new MessageResponse("Customer created successfully!"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody Customer customerDetails) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null || !customer.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Customer not found or access denied."));
        }

        customer.setName(customerDetails.getName());
        customer.setEmail(customerDetails.getEmail());
        customer.setPhone(customerDetails.getPhone());
        customer.setAddress(customerDetails.getAddress());

        customerRepository.save(customer);
        return ResponseEntity.ok(new MessageResponse("Customer updated successfully!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null || !customer.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Customer not found or access denied."));
        }

        customerRepository.delete(customer);
        return ResponseEntity.ok(new MessageResponse("Customer deleted successfully!"));
    }
}
