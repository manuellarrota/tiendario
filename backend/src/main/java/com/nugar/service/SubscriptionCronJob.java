package com.nugar.service;

import com.nugar.domain.Company;
import com.nugar.domain.GlobalConfig;
import com.nugar.domain.Notification;
import com.nugar.domain.SubscriptionStatus;
import com.nugar.repository.CompanyRepository;
import com.nugar.repository.GlobalConfigRepository;
import com.nugar.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class SubscriptionCronJob {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionCronJob.class);

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private GlobalConfigRepository globalConfigRepository;

    // Run every day at 00:05 AM
    @Scheduled(cron = "0 5 0 * * ?")
    @Transactional
    public void generateSubscriptionReminders() {
        log.info("[SUBSCRIPTION_REMINDER] Iniciando escaneo diario de membresías...");

        // 7 days from today
        LocalDate targetDate = LocalDate.now().plusDays(7);
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(LocalTime.MAX);

        List<Company> expiringCompanies = companyRepository.findBySubscriptionStatusAndSubscriptionEndDateBetween(
                SubscriptionStatus.PAID, startOfDay, endOfDay);

        GlobalConfig config = globalConfigRepository.findFirstByOrderByIdAsc().orElse(new GlobalConfig());
        BigDecimal planPrice = config.getPremiumPlanMonthlyPrice() != null ? config.getPremiumPlanMonthlyPrice() : new BigDecimal("20.00");
        BigDecimal extraPrice = config.getExtraRegisterMonthlyPrice() != null ? config.getExtraRegisterMonthlyPrice() : new BigDecimal("5.00");

        for (Company company : expiringCompanies) {
            int activeExtra = company.getExtraRegisters() != null ? company.getExtraRegisters() : 0;
            
            // Check if there is a pending reduction
            if (company.getNextCycleExtraRegisters() != null) {
                activeExtra = company.getNextCycleExtraRegisters();
            }

            BigDecimal extraTotal = extraPrice.multiply(new BigDecimal(activeExtra));
            BigDecimal grandTotal = planPrice.add(extraTotal);

            Notification notification = new Notification();
            notification.setCompany(company);
            notification.setTitle("Próximo cobro de Membresía");
            notification.setMessage(String.format("Tu suscripción vence en 7 días. El monto a cancelar será de $%s ($%s de membresía + $%s por %d cajas activas). ¡Por favor realiza tu pago para evitar interrupciones!",
                    grandTotal.toString(), planPrice.toString(), extraTotal.toString(), activeExtra));
            notification.setType("BILLING");
            notification.setCreatedAt(LocalDateTime.now());
            notification.setReadStatus(false);

            notificationRepository.save(notification);
            log.info("[SUBSCRIPTION_REMINDER] Empresa ID: {} | Notificación enviada | Monto: {}", company.getId(), grandTotal);
        }

        log.info("[SUBSCRIPTION_REMINDER] Proceso finalizado | Recordatorios enviados: {}", expiringCompanies.size());
    }
}
