package com.nugar.repository;

import com.nugar.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    long countByCompanyIdAndReadStatusFalse(Long companyId);

    long countByCompanyIsNullAndReadStatusFalse();

    @Query("SELECT n.type, COUNT(n) FROM Notification n WHERE n.company IS NULL AND n.readStatus = false GROUP BY n.type")
    List<Object[]> countUnreadSuperAdminNotificationsByType();

    Page<Notification> findByCompanyIsNullOrderByCreatedAtDesc(Pageable pageable);

    Page<Notification> findByCompanyIsNullAndTypeOrderByCreatedAtDesc(String type, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.company IS NULL AND " +
           "(LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(n.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Notification> searchSuperAdminNotifications(@Param("search") String search, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.company IS NULL AND n.type = :type AND " +
           "(LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(n.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Notification> searchSuperAdminNotificationsByType(@Param("type") String type, @Param("search") String search, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.company IS NULL " +
           "AND (:type IS NULL OR n.type = :type) " +
           "AND (:readStatus IS NULL OR n.readStatus = :readStatus) " +
           "AND (:search IS NULL OR :search = '' OR LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(n.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Notification> searchSuperAdminNotificationsAdvanced(
        @Param("type") String type,
        @Param("search") String search,
        @Param("readStatus") Boolean readStatus,
        Pageable pageable
    );
}
