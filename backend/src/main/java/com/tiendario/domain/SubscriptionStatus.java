package com.tiendario.domain;

/**
 * Estados de suscripcion de una empresa en Tiendario.
 *
 * MODELO DE PRECIOS (2 planes, sin intermedios):
 *   - TRIAL  → Plan gratuito de 30 dias asignado al registrarse. Acceso completo.
 *   - PAID   → Plan Premium activado por el Super Admin al aprobar un pago.
 *              $20/mes (30 dias) o $200/ano (365 dias, ajuste manual en el panel).
 *
 * No existe un plan FREE permanente ni un plan Starter.
 * Al vencer TRIAL o PAID sin pago nuevo, el estado pasa a PAST_DUE.
 */
public enum SubscriptionStatus {
    /**
     * Periodo de prueba de 30 dias. Funcionalidad completa.
     * Se asigna automaticamente al registrar una nueva empresa.
     */
    TRIAL,

    /**
     * Pago aprobado por el Super Admin.
     * Acceso activo hasta subscriptionEndDate.
     * Planes: $20/mes (30 dias) o $200/ano (365 dias).
     */
    PAID,

    /**
     * TRIAL o PAID vencido sin renovacion.
     * Solo lectura: no se pueden crear ni editar registros.
     */
    PAST_DUE,

    /**
     * Bloqueado manualmente por el Super Admin.
     * Acceso total denegado.
     */
    SUSPENDED
}
