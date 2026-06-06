package com.campusshare.config;

import org.springframework.context.annotation.Configuration;

/**
 * WebMVC configuration.
 * CORS is handled entirely by SecurityConfig.corsConfigurationSource()
 * using the configurable cors.allowed-origins property, so no
 * duplicate / hardcoded CORS mapping is defined here.
 */
@Configuration
public class WebConfig {
    // Intentionally empty – CORS is owned by SecurityConfig.
}
