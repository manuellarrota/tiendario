package com.nugar.web;

import com.nugar.domain.Customer;
import com.nugar.payload.response.MessageResponse;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.CustomerRepository;
import com.nugar.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    CompanyRepository companyRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public List<Customer> getCustomers() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return customerRepository.findByCompanyId(userDetails.getCompanyId());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        // Validate mandatory fields
        if (customer.getName() == null || customer.getName().trim().isEmpty() ||
            customer.getCedula() == null || customer.getCedula().trim().isEmpty() ||
            customer.getPhone() == null || customer.getPhone().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: El nombre, la cédula y el teléfono son obligatorios."));
        }

        // Check if email already exists for this company
        if (customer.getEmail() != null && !customer.getEmail().isEmpty()) {
            if (!customerRepository.findByEmailAndCompanyId(customer.getEmail(), userDetails.getCompanyId())
                    .isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: El correo ya está registrado para esta empresa."));
            }
        }

        // Check if cedula already exists for this company
        if (customer.getCedula() != null && !customer.getCedula().trim().isEmpty()) {
            if (customerRepository.existsByCompanyIdAndCedula(userDetails.getCompanyId(), customer.getCedula())) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: La cédula/ID ya está registrada para esta empresa."));
            }
        }

        customer.setCompany(companyRepository.findById(userDetails.getCompanyId()).orElse(null));
        Customer savedCustomer = customerRepository.save(customer);

        log.info("[NUEVO CLIENTE] Registrado por: {} | Nombre: {} | Cedula: {} | Telefono: {} | Email: {} | Empresa ID: {}",
            userDetails.getUsername(), savedCustomer.getName(), savedCustomer.getCedula(),
            savedCustomer.getPhone(), savedCustomer.getEmail(), userDetails.getCompanyId());

        return ResponseEntity.ok(savedCustomer);
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
        customer.setCedula(customerDetails.getCedula());
        customer.setAddress(customerDetails.getAddress());

        customerRepository.save(customer);
        log.info("[CLIENTE ACTUALIZADO] Modificado por: {} | Cliente ID: {} | Nombre: {} | Cedula: {} | Telefono: {} | Empresa ID: {}",
            userDetails.getUsername(), id, customer.getName(), customer.getCedula(),
            customer.getPhone(), userDetails.getCompanyId());
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

        log.warn("[CLIENTE ELIMINADO] Eliminado por: {} | Cliente ID: {} | Nombre: {} | Cédula: {} | Teléfono: {} | Empresa ID: {}",
            userDetails.getUsername(), id, customer.getName(), customer.getCedula(),
            customer.getPhone(), userDetails.getCompanyId());
        customerRepository.delete(customer);
        return ResponseEntity.ok(new MessageResponse("Customer deleted successfully!"));
    }
}
