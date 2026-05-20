package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.Role;
import com.nugar.domain.User;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class StaffService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getCompanyStaff(Long companyId) {
        return userRepository.findByCompanyIdAndRole(companyId, Role.ROLE_CASHIER);
    }

    @Transactional
    public User createCashier(String username, String email, String password, Long companyId, String managerUsername) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Error: ¡El nombre de usuario ya está en uso!");
        }

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Error: ¡El correo electrónico ya está en uso!");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Error: Empresa no encontrada."));

        // Count only cashiers — the Manager (owner) does NOT consume a register slot
        long currentCashierCount = userRepository.countByCompanyIdAndRole(companyId, Role.ROLE_CASHIER);
        int planLimit = company.getSubscriptionPlan() != null ? company.getSubscriptionPlan().getDefaultRegisterLimit() : 1;
        int extraLimit = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
        int totalLimit = planLimit + extraLimit;

        if (currentCashierCount >= totalLimit) {
            throw new RuntimeException("Error: Límite de " + totalLimit + " caja(s) alcanzado para tu plan. Adquiere cajas adicionales o mejora tu plan.");
        }

        User cashier = new User();
        cashier.setUsername(username);
        cashier.setEmail(email);
        cashier.setPassword(passwordEncoder.encode(password));
        cashier.setRole(Role.ROLE_CASHIER);
        cashier.setCompany(company);
        cashier.setEnabled(true); // Cashiers are active immediately

        cashier = userRepository.save(cashier);
        
        log.info("[SEGURIDAD/STAFF] Manager: {} | Acción: CREAR CAJERO | Nuevo Usuario: {} | Empresa: {}", 
            managerUsername, cashier.getUsername(), company.getName());

        return cashier;
    }

    @Transactional
    public User toggleStaffStatus(Long userId, Long companyId, String managerUsername) {
        User staff = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Error: Usuario no encontrado."));

        // Security check
        if (staff.getCompany() == null || !staff.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Error: No tienes permiso para modificar este usuario.");
        }

        if (staff.getRole() != Role.ROLE_CASHIER) {
            throw new RuntimeException("Error: Solo puedes modificar cuentas de cajeros.");
        }

        staff.setEnabled(!staff.isEnabled());
        staff = userRepository.save(staff);

        log.warn("[SEGURIDAD/STAFF] Manager: {} | Acción: {} CAJERO | Afectado: {} | Empresa: {}", 
            managerUsername, staff.isEnabled() ? "ACTIVAR" : "SUSPENDER", staff.getUsername(), staff.getCompany().getName());

        return staff;
    }
}
