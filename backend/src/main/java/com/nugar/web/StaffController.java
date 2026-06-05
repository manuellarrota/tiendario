package com.nugar.web;

import com.nugar.domain.User;
import com.nugar.security.UserDetailsImpl;
import com.nugar.service.StaffService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.nugar.util.BusinessLogger;
import java.util.List;

@RestController
@RequestMapping("/api/company/staff")
public class StaffController {

    private static final Logger log = LoggerFactory.getLogger(StaffController.class);

    @Autowired
    private StaffService staffService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public List<User> getStaff() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return staffService.getCompanyStaff(userDetails.getCompanyId());
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createStaff(@RequestBody StaffRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        try {
            User newCashier = staffService.createCashier(
                    request.getUsername(),
                    request.getEmail(),
                    request.getPassword(),
                    userDetails.getCompanyId(),
                    userDetails.getUsername()
            );
            BusinessLogger.log(log, "NUEVO_CAJERO", data -> {
                data.put("creadoPor", userDetails.getUsername());
                data.put("empresaId", userDetails.getCompanyId());
                data.put("cajeroId", newCashier.getId());
                data.put("username", newCashier.getUsername());
                data.put("email", newCashier.getEmail());
                data.put("estado", "ACTIVO");
            });
            return ResponseEntity.ok(newCashier);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PutMapping("/{id}/toggle")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> toggleStaffStatus(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        try {
            User updatedStaff = staffService.toggleStaffStatus(id, userDetails.getCompanyId(), userDetails.getUsername());
            BusinessLogger.warn(log, "CAJERO_ESTADO_CAMBIADO", data -> {
                data.put("modificadoPor", userDetails.getUsername());
                data.put("empresaId", userDetails.getCompanyId());
                data.put("cajeroId", updatedStaff.getId());
                data.put("username", updatedStaff.getUsername());
                data.put("nuevoEstado", updatedStaff.isEnabled() ? "ACTIVO" : "INACTIVO");
            });
            return ResponseEntity.ok(updatedStaff);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        try {
            staffService.deleteCashier(id, userDetails.getCompanyId(), userDetails.getUsername());
            return ResponseEntity.ok(new MessageResponse("Cajero eliminado exitosamente."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    public static class StaffRequest {
        private String username;
        private String email;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class MessageResponse {
        private String message;
        public MessageResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
