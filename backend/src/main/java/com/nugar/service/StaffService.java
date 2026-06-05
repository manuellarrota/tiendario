package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.Role;
import com.nugar.domain.User;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.UserRepository;
import com.nugar.repository.SaleRepository;
import com.nugar.repository.ShiftRepository;
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
    private SaleRepository saleRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getCompanyStaff(Long companyId) {
        return userRepository.findByCompanyIdAndRolesContaining(companyId, Role.ROLE_CASHIER);
    }

    @Transactional
    public User createCashier(String username, String email, String password, Long companyId, String managerUsername) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Error: Empresa no encontrada."));

        User existingUserByEmail = userRepository.findByEmail(email).orElse(null);
        User existingUserByUsername = userRepository.findByUsername(username).orElse(null);

        User cashier;

        if (existingUserByEmail != null || existingUserByUsername != null) {
            // Validate if email and username belong to different accounts
            if (existingUserByEmail != null && existingUserByUsername != null && !existingUserByEmail.getId().equals(existingUserByUsername.getId())) {
                throw new RuntimeException("Error: El correo y el usuario proporcionados pertenecen a cuentas diferentes.");
            }

            cashier = existingUserByEmail != null ? existingUserByEmail : existingUserByUsername;

            if (cashier.getCompany() != null && !cashier.getCompany().getId().equals(companyId)) {
                throw new RuntimeException("Error: Este usuario ya pertenece a otra empresa como empleado.");
            }

            if (cashier.getCompany() != null && cashier.getCompany().getId().equals(companyId) && cashier.getRoles().contains(Role.ROLE_CASHIER)) {
                throw new RuntimeException("Error: Este usuario ya es cajero en tu empresa.");
            }

            // "Hire" the client
            cashier.getRoles().add(Role.ROLE_CASHIER);
            cashier.setCompany(company);
        } else {
            // Create a brand new user
            cashier = new User();
            cashier.setUsername(username);
            cashier.setEmail(email);
            cashier.setPassword(passwordEncoder.encode(password));
            cashier.getRoles().add(Role.ROLE_CASHIER);
            cashier.setCompany(company);
            cashier.setEnabled(true);
        }

        cashier = userRepository.save(cashier);
        
        log.info("[SEGURIDAD/STAFF] Manager: {} | Accion: CREAR CAJERO | Nuevo Usuario: {} | Empresa: {}", 
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

        if (!staff.getRoles().contains(Role.ROLE_CASHIER)) {
            throw new RuntimeException("Error: Solo puedes modificar cuentas de cajeros.");
        }

        staff.setEnabled(!staff.isEnabled());
        staff = userRepository.save(staff);

        log.warn("[SEGURIDAD/STAFF] Manager: {} | Accion: {} CAJERO | Afectado: {} | Empresa: {}", 
            managerUsername, staff.isEnabled() ? "ACTIVAR" : "SUSPENDER", staff.getUsername(), staff.getCompany().getName());

        return staff;
    }

    @Transactional
    public void deleteCashier(Long userId, Long companyId, String managerUsername) {
        User staff = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Error: Usuario no encontrado."));

        if (staff.getCompany() == null || !staff.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Error: No tienes permiso para eliminar este usuario.");
        }

        if (!staff.getRoles().contains(Role.ROLE_CASHIER)) {
            throw new RuntimeException("Error: Solo puedes eliminar cuentas de cajeros.");
        }

        boolean hasSales = saleRepository.existsByUserId(userId);
        boolean hasShifts = shiftRepository.existsByUserId(userId);

        if (hasSales || hasShifts) {
            staff.setEnabled(false);
            userRepository.save(staff);
            log.warn("[SEGURIDAD/STAFF] Manager: {} | Accion: INTENTO BORRADO DENEGADO (Cajero SUSPENDIDO) | Afectado: {} | Empresa: {}", 
                managerUsername, staff.getUsername(), staff.getCompany().getName());
            throw new RuntimeException("Este cajero ya tiene ventas o turnos registrados. Por seguridad contable no puede ser eliminado permanentemente, pero ha sido suspendido para que no pueda acceder.");
        }

        userRepository.delete(staff);
        log.info("[SEGURIDAD/STAFF] Manager: {} | Accion: ELIMINAR CAJERO | Eliminado: {} | Empresa: {}", 
            managerUsername, staff.getUsername(), staff.getCompany().getName());
    }
}
