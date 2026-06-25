package com.nugar.web;

import com.nugar.domain.Notification;
import com.nugar.repository.NotificationRepository;
import com.nugar.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    com.nugar.repository.SaleRepository saleRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public List<Notification> getNotifications() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        if (userDetails.getCompanyId() == null) return List.of();
        
        List<Notification> notifications = notificationRepository.findByCompanyIdOrderByCreatedAtDesc(userDetails.getCompanyId());
        
        for (Notification n : notifications) {
            if ("SALE".equals(n.getType()) && n.getReferenceId() != null) {
                saleRepository.findById(n.getReferenceId()).ifPresent(sale -> {
                    n.setRelatedEntityStatus(sale.getStatus() != null ? sale.getStatus().name() : null);
                });
            }
        }
        return notifications;
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN') or hasRole('CASHIER')")
    public long getUnreadCount() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        if (userDetails.getCompanyId() == null) return 0;
        return notificationRepository.countByCompanyIdAndReadStatusFalse(userDetails.getCompanyId());
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasRole('MANAGER') or hasRole('CASHIER')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification != null) {
            notification.setReadStatus(true);
            notificationRepository.save(notification);
        }
        return ResponseEntity.ok().build();
    }
}
