package com.nugar.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.Logger;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Utilidad para emitir logs de negocio estructurados en formato JSON.
 * Usar con el logger del componente que lo invoca.
 *
 * Ejemplo de uso:
 *   BusinessLogger.log(log, "TURNO_ABIERTO", data -> {
 *       data.put("cajero", username);
 *       data.put("caja", cajaName);
 *   });
 */
public class BusinessLogger {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    @FunctionalInterface
    public interface DataBuilder {
        void build(Map<String, Object> data);
    }

    /**
     * Emite un log de negocio con el evento y los datos proporcionados en JSON.
     *
     * @param logger    El Logger de SLF4J del componente invocador.
     * @param evento    Nombre del evento (ej. "TURNO_ABIERTO", "NUEVA_VENTA").
     * @param builder   Lambda para poblar el mapa de datos del evento.
     */
    public static void log(Logger logger, String evento, DataBuilder builder) {
        Map<String, Object> data = new LinkedHashMap<>();
        builder.build(data);
        try {
            String json = MAPPER.writeValueAsString(data);
            logger.info("[{}]\n{}", evento, json);
        } catch (JsonProcessingException e) {
            logger.info("[{}] (error serializando JSON: {})", evento, e.getMessage());
        }
    }

    /**
     * Emite un log de negocio a nivel WARN.
     */
    public static void warn(Logger logger, String evento, DataBuilder builder) {
        Map<String, Object> data = new LinkedHashMap<>();
        builder.build(data);
        try {
            String json = MAPPER.writeValueAsString(data);
            logger.warn("[{}]\n{}", evento, json);
        } catch (JsonProcessingException e) {
            logger.warn("[{}] (error serializando JSON: {})", evento, e.getMessage());
        }
    }
}
