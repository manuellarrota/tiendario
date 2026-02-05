package com.tiendario.web;

import com.tiendario.domain.Notification;
import com.tiendario.repository.NotificationRepository;
import com.tiendario.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    NotificationRepository notificationRepository;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public List<Notification> getNotifications() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return notificationRepository.findByCompanyIdOrderByCreatedAtDesc(userDetails.getCompanyId());
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasRole('MANAGER')")
    public long getUnreadCount() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();
        return notificationRepository.countByCompanyIdAndReadStatusFalse(userDetails.getCompanyId());
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id).orElse(null);
        if (notification != null) {
            notification.setReadStatus(true);
            notificationRepository.save(notification);
        }
        return ResponseEntity.ok().build();
    }
}
