package com.tiendario.service;

import com.tiendario.domain.Company;
import com.tiendario.domain.SubscriptionStatus;
import com.tiendario.repository.CompanyRepository;
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

    /**
     * Revisa diariamente a la medianoche (00:00) las suscripciones que han vencido.
     * Si subscriptionEndDate < ahora y status es PAID o TRIAL, pasa a PAST_DUE.
     */
    @Scheduled(cron = "0 0 0 * * ?") // Todos los días a las 00:00:00
    @Transactional
    public void checkExpiredSubscriptions() {
        log.info("Iniciando tarea programada: Verificación de suscripciones vencidas...");

        LocalDateTime now = LocalDateTime.now();
        List<SubscriptionStatus> activeStatuses = Arrays.asList(SubscriptionStatus.PAID, SubscriptionStatus.TRIAL);

        List<Company> expiredCompanies = companyRepository
                .findBySubscriptionStatusInAndSubscriptionEndDateBefore(activeStatuses, now);

        if (expiredCompanies.isEmpty()) {
            log.info("No se encontraron suscripciones vencidas hoy.");
            return;
        }

        log.info("Se encontraron {} empresas con suscripción vencida. Procesando...", expiredCompanies.size());

        for (Company company : expiredCompanies) {
            log.warn("Suscripción vencida para empresa ID: {} ({}), Venció: {}. Cambiando a PAST_DUE.",
                    company.getId(), company.getName(), company.getSubscriptionEndDate());

            company.setSubscriptionStatus(SubscriptionStatus.PAST_DUE);
            // TODO: Enviar email de notificación al usuario
        }

        companyRepository.saveAll(expiredCompanies);
        log.info("Tarea finalizada. {} empresas actualizadas a PAST_DUE.", expiredCompanies.size());
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
