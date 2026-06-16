package com.nugar.domain;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "admin_audit_log")
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Username del Super Admin que realizó la acción */
    @Column(nullable = false)
    private String adminUsername;

    /** Empresa afectada */
    @Column(nullable = false)
    private Long companyId;

    /** Tipo de entidad modificada: SALE, PURCHASE, PRODUCT */
    @Column(nullable = false)
    private String entityType;

    /** ID del registro modificado */
    @Column(nullable = false)
    private Long entityId;

    /** Acción realizada: EDIT o VOID */
    @Column(nullable = false)
    private String actionType;

    /** Campo modificado (solo en EDIT). Ej: "totalAmount", "paymentMethod" */
    private String fieldChanged;

    /** Valor anterior (como String serializado) */
    @Column(columnDefinition = "TEXT")
    private String oldValue;

    /** Valor nuevo (como String serializado) */
    @Column(columnDefinition = "TEXT")
    private String newValue;

    /** Motivo obligatorio para VOID, opcional para EDIT */
    @Column(columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime timestamp;
}
