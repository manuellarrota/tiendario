package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.repository.CompanyRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduledTasksService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasksService.class);
    private final CompanyRepository companyRepository;
    private final EmailService emailService;
    private final com.nugar.repository.UserRepository userRepository;

    /**
     * Revisa diariamente a la medianoche (00:00) las suscripciones que han vencido.
     * Si subscriptionEndDate < ahora y status es PAID o TRIAL, pasa a PAST_DUE.
     */
    @Scheduled(cron = "0 0 0 * * ?") // Todos los días a las 00:00:00
    @Transactional
    public void checkExpiredSubscriptions() {
        log.info("[SUSCRIPCION_CRON] Iniciando tarea programada: Verificacion de suscripciones vencidas...");

        LocalDateTime now = LocalDateTime.now();
        List<SubscriptionStatus> activeStatuses = Arrays.asList(SubscriptionStatus.PAID, SubscriptionStatus.TRIAL);

        List<Company> expiredCompanies = companyRepository
                .findBySubscriptionStatusInAndSubscriptionEndDateBefore(activeStatuses, now);

        if (expiredCompanies.isEmpty()) {
            log.info("[SUSCRIPCION_CRON] No se encontraron suscripciones vencidas hoy.");
            return;
        }

        log.info("[SUSCRIPCION_CRON] Se encontraron {} empresas con suscripcion vencida. Procesando...", expiredCompanies.size());

        for (Company company : expiredCompanies) {
            log.warn("[SUSCRIPCION_CRON] Suscripcion vencida para empresa ID: {} ({}), Vencio: {}. Cambiando a PAST_DUE.",
                    company.getId(), company.getName(), company.getSubscriptionEndDate());

            company.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
            // Note: Email notification will be sent via Spring Mail when SMTP is
            // configured.
        }

        companyRepository.saveAll(expiredCompanies);
        log.info("[SUSCRIPCION_CRON] Tarea finalizada. {} empresas actualizadas a PAST_DUE.", expiredCompanies.size());
    }

    /**
     * Revisa diariamente a las 8:00 AM las suscripciones que vencen en exactamente 3 días.
     * Envía un correo preventivo a los administradores de la tienda.
     */
    @Scheduled(cron = "0 0 8 * * ?") // Todos los días a las 08:00:00
    @Transactional
    public void sendSubscriptionWarnings() {
        log.info("[SUSCRIPCION_CRON] Iniciando tarea programada: Alerta de suscripciones por vencer (3 dias)...");

        LocalDateTime now = LocalDateTime.now();
        // Queremos las que venzan entre el inicio y el fin del 3er día a partir de hoy
        LocalDateTime startOfTargetDay = now.plusDays(3).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfTargetDay = startOfTargetDay.plusDays(1);

        List<SubscriptionStatus> activeStatuses = Arrays.asList(SubscriptionStatus.PAID, SubscriptionStatus.TRIAL);

        List<Company> expiringCompanies = companyRepository.findAll().stream()
                .filter(c -> activeStatuses.contains(c.getSubscriptionStatus()))
                .filter(c -> c.getSubscriptionEndDate() != null && 
                             c.getSubscriptionEndDate().isAfter(startOfTargetDay) &&
                             c.getSubscriptionEndDate().isBefore(endOfTargetDay))
                .toList();

        if (expiringCompanies.isEmpty()) {
            log.info("[SUSCRIPCION_CRON] No hay suscripciones que venzan en 3 dias exactos.");
            return;
        }

        log.info("[SUSCRIPCION_CRON] Se encontraron {} empresas con suscripcion por vencer. Enviando correos...", expiringCompanies.size());

        for (Company company : expiringCompanies) {
            String formattedDate = company.getSubscriptionEndDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            
            userRepository.findByCompanyIdAndRolesContaining(company.getId(), com.nugar.domain.Role.ROLE_MANAGER)
                    .forEach(manager -> {
                        if (manager.getEmail() != null) {
                            emailService.sendSubscriptionWarningEmail(
                                    manager.getEmail(),
                                    company.getName(),
                                    formattedDate
                            );
                            log.info("[SUSCRIPCION_CRON] Correo preventivo enviado a {} (Empresa: {})", manager.getEmail(), company.getName());
                        }
                    });
        }
        log.info("[SUSCRIPCION_CRON] Tarea de prevencion finalizada.");
    }

    /**
     * Limpieza de datos y mantenimiento
     * Ejecuta a la 1:00 AM.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void performMaintenanceTasks() {
        log.info(
                "Ejecutando tareas de mantenimiento diario (Placeholder: Limpieza de carritos abandonados, logs, etc)...");
        // Futura implementación:
        // cartRepository.deleteByUpdatedAtBefore(now.minusDays(7));
    }
}
