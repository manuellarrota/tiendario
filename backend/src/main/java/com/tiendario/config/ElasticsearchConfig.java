package com.tiendario.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

/**
 * Elasticsearch configuration that is only enabled when the "elasticsearch"
 * profile is active.
 * This allows running without Elasticsearch during development/testing.
 * 
 * To enable Elasticsearch:
 * - Set SPRING_PROFILES_ACTIVE=elasticsearch (or add to application.properties)
 * - Ensure Elasticsearch is running at the configured URL
 */
@Configuration
@Profile("elasticsearch")
@EnableElasticsearchRepositories(basePackages = "com.tiendario.repository.search")
public class ElasticsearchConfig {
    // Elasticsearch repositories are automatically configured when this profile is
    // active
}
