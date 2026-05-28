package com.nugar.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nugar.domain.GlobalConfig;
import com.nugar.repository.GlobalConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Bot de actualización automática de tasas de cambio.
 * Consulta fuentes oficiales para VES y COP cada mañana.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final GlobalConfigRepository configRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // URLs de confianza (BCV via DolarApi y COP via OpenER)
    private static final String BCV_API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
    private static final String COP_API_URL = "https://open.er-api.com/v6/latest/USD";

    /**
     * Tarea programada: Todos los días a las 6:00 AM
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void scheduleRateUpdate() {
        log.info("[TASAS DE CAMBIO] Cron 6:00 AM activado. Actualizando...");
        updateRates();
    }

    /**
     * Ejecuta la actualización de tasas consultando las APIs externas.
     */
    public void updateRates() {
        try {
            GlobalConfig config = configRepository.findFirstByOrderByIdAsc()
                    .orElseGet(() -> configRepository.save(new GlobalConfig()));

            // Consultando APIs externas (BCV y OpenER)
            
            // 1. Obtener tasa BCV (Bolívares) - promedio es el campo oficial
            BigDecimal vesRate = fetchVesRate();
            
            // 2. Obtener tasa COP (Pesos Colombianos)
            BigDecimal copRate = fetchCopRate();

            if (vesRate == null && copRate == null) {
                log.warn("[TASAS_CAMBIO] No se pudieron obtener tasas nuevas. Se mantiene la configuracion actual.");
                return;
            }

            // 3. Actualizar JSON de monedas en GlobalConfig
            String updatedCurrencies = updateCurrenciesJson(config.getCurrencies(), vesRate, copRate);
            
            config.setCurrencies(updatedCurrencies);
            
            // Actualizamos también el campo legacy exchangeRate si obtuvimos VES
            if (vesRate != null) {
                config.setExchangeRate(vesRate);
            }
            
            configRepository.save(config);
            log.info("[TASAS DE CAMBIO] Actualizadas -> VES: {} | COP: {}", 
                    vesRate != null ? vesRate : "sin cambio", 
                    copRate != null ? copRate : "sin cambio");

        } catch (Exception e) {
            log.error("[TASAS_CAMBIO] Error critico en el bot de tasas: {}", e.getMessage(), e);
        }
    }

    private BigDecimal fetchVesRate() {
        try {
            // DolarApi retorna un objeto con { "promedio": 36.55, ... }
            Map<?, ?> response = restTemplate.getForObject(BCV_API_URL, Map.class);
            if (response != null && response.get("promedio") != null) {
                return new BigDecimal(response.get("promedio").toString());
            }
        } catch (Exception e) {
            log.error("[TASAS_CAMBIO] Error al obtener tasa VES (BCV): {}", e.getMessage());
        }
        return null;
    }

    private BigDecimal fetchCopRate() {
        try {
            // OpenER retorna { "rates": { "COP": 3950.5, ... } }
            Map<?, ?> response = restTemplate.getForObject(COP_API_URL, Map.class);
            if (response != null && response.get("rates") != null) {
                Map<?, ?> rates = (Map<?, ?>) response.get("rates");
                if (rates.get("COP") != null) {
                    return new BigDecimal(rates.get("COP").toString());
                }
            }
        } catch (Exception e) {
            log.error("[TASAS_CAMBIO] Error al obtener tasa COP: {}", e.getMessage());
        }
        return null;
    }

    private String updateCurrenciesJson(String currentJson, BigDecimal vesRate, BigDecimal copRate) {
        try {
            if (currentJson == null || currentJson.isEmpty()) {
                currentJson = "[]";
            }
            
            List<Map<String, Object>> currencies = objectMapper.readValue(currentJson, new TypeReference<List<Map<String, Object>>>() {});
            
            boolean updated = false;
            for (Map<String, Object> currency : currencies) {
                String code = (String) currency.get("code");
                if ("VES".equals(code) && vesRate != null) {
                    currency.put("rate", vesRate);
                    updated = true;
                } else if ("COP".equals(code) && copRate != null) {
                    currency.put("rate", copRate);
                    updated = true;
                }
            }
            
            // Si la moneda no existía en el JSON, podríamos agregarla aquí si quisiéramos, 
            // pero por ahora solo actualizamos las existentes habilitadas por el admin.
            
            return objectMapper.writeValueAsString(currencies);
        } catch (Exception e) {
            log.error("[TASAS_CAMBIO] Error al parsear o escribir JSON de monedas: {}", e.getMessage());
            return currentJson;
        }
    }
}
