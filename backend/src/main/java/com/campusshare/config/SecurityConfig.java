package com.campusshare.config;

import com.campusshare.security.JwtFilter;
import com.campusshare.security.RestAccessDeniedHandler;
import com.campusshare.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * Production-grade Spring Security configuration.
 *
 * RBAC summary
 * ────────────
 * Public (no token needed):
 *   POST /api/auth/**                  – register, login, refresh, logout
 *   GET  /api/products/**              – browse marketplace
 *   GET  /api/listings/**              – alias for products
 *   GET  /api/categories/**            – category list
 *   GET  /api/notes/**                 – approved notes
 *   GET  /api/chat/online              – online user list (presence)
 *   /swagger-ui/**, /v3/api-docs/**    – API docs
 *   /ws/**                             – WebSocket handshake (JWT auth inside WS)
 *
 * Authenticated (STUDENT or ADMIN):
 *   All other endpoints not listed above or below.
 *
 * ADMIN only (hasRole('ADMIN')):
 *   /api/admin/**
 *   PATCH /api/products/{id}/status   – handled via @PreAuthorize in controller
 *   GET   /api/notes/admin            – handled via @PreAuthorize in controller
 *   PATCH /api/notes/{id}/status      – handled via @PreAuthorize in controller
 *   POST  /api/categories             – handled via @PreAuthorize in controller
 *
 * Method-level security (@PreAuthorize) is the fine-grained layer on top.
 */
@Configuration
@EnableMethodSecurity          // enables @PreAuthorize, @PostAuthorize, @Secured
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Value("${cors.allowed-origins:https://campus-resource-sharing-platform.vercel.app}")
    private String allowedOrigins;

    // ── Beans ─────────────────────────────────────────────────────────────────

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt cost factor 12 – suitable for production; ~250ms on modern hardware
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(passwordEncoder);
        provider.setUserDetailsService(userDetailsService);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isBlank())
                .forEach(config::addAllowedOriginPattern);
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        // Expose the Authorization header so the client can read it from CORS responses
        config.addExposedHeader("Authorization");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    @org.springframework.core.annotation.Order(1)
    public SecurityFilterChain notePreviewSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/notes/*/preview")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(frame -> frame.disable())
                        .contentTypeOptions(cto -> {})
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives(
                                        "default-src 'self'; " +
                                        "img-src 'self' https://res.cloudinary.com data:; " +
                                        "connect-src 'self' https://campus-resource-sharing-platform.vercel.app " +
                                        "https://campus-resource-sharing-platform.onrender.com " +
                                        "wss://campus-resource-sharing-platform.onrender.com; " +
                                        "frame-ancestors https://campus-resource-sharing-platform.vercel.app"))
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=(), payment=()"))
                )
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .build();
    }

    // ── Filter chain ──────────────────────────────────────────────────────────

    @Bean
    @org.springframework.core.annotation.Order(2)
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationProvider authenticationProvider) throws Exception {

        return http
                // ── CSRF ────────────────────────────────────────────────────
                // Disabled: stateless JWT API; CSRF protection is irrelevant without
                // session cookies. If cookies are introduced later, re-enable CSRF.
                .csrf(csrf -> csrf.disable())

                // ── CORS ─────────────────────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── Disable unused auth mechanisms ────────────────────────────
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())

                // ── Stateless sessions ─────────────────────────────────────────
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── Security response headers ──────────────────────────────────
                .headers(headers -> headers
                        // Prevent clickjacking
                        .frameOptions(frame -> frame.deny())
                        // Prevent MIME-type sniffing
                        .contentTypeOptions(cto -> {})
                        // HSTS: instruct browsers to use HTTPS for 1 year
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        // Content-Security-Policy: restrict resource origins
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives(
                                        "default-src 'self'; " +
                                        "img-src 'self' https://res.cloudinary.com data:; " +
                                        "connect-src 'self' https://campus-resource-sharing-platform.vercel.app " +
                                        "https://campus-resource-sharing-platform.onrender.com " +
                                        "wss://campus-resource-sharing-platform.onrender.com; " +
                                        "frame-ancestors 'none'"))
                        // Referrer-Policy: don't leak URL info to third parties
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        // Permissions-Policy: disable sensitive browser APIs
                        .permissionsPolicy(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=(), payment=()"))
                )

                // ── Exception handlers ─────────────────────────────────────────
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))

                // ── Authentication provider ────────────────────────────────────
                .authenticationProvider(authenticationProvider)

                // ── Authorization rules ────────────────────────────────────────
                .authorizeHttpRequests(authorize -> authorize

                        // ── Fully public ──────────────────────────────────────
                        .requestMatchers(
                                "/api/auth/**",
                                "/actuator/health",
                                "/actuator/info",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/ws/**")
                        .permitAll()

                        .requestMatchers(HttpMethod.GET, "/actuator/metrics", "/actuator/metrics/**")
                        .authenticated()

                        // Public GET on browseable resources
                        .requestMatchers(HttpMethod.GET,
                                "/api/products/**",
                                "/api/listings/**",
                                "/api/categories/**",
                                "/api/notes/**",
                                "/api/chat/online",
                                "/api/reviews/user/**")
                        .permitAll()

                        // ── Admin only ────────────────────────────────────────
                        // Fine-grained admin endpoints additionally protected by
                        // @PreAuthorize("hasRole('ADMIN')") in each controller.
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // ── Everything else requires authentication ────────────
                        .anyRequest()
                        .authenticated()
                )

                // ── JWT filter ─────────────────────────────────────────────────
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

                .build();
    }
}
