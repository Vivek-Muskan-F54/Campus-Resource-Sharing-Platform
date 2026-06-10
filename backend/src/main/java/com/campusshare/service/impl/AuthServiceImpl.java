package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.TokenRefreshException;
import com.campusshare.domain.RefreshToken;
import com.campusshare.domain.User;
import com.campusshare.dto.AuthDtos.*;
import com.campusshare.repository.RefreshTokenRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.security.JwtUtil;
import com.campusshare.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    @Value("${app.jwt.access-expiration-ms}")
    private long accessExpirationMs;

    @Override
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setCollegeRollNumber(request.collegeRollNumber().trim());
        User saved = users.save(user);
        log.info("event=auth_registration user_id={}", saved.getId());
        return createTokenResponse(saved);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (Exception ex) {
            // Log the failure without the password; re-throw so the
            // GlobalExceptionHandler returns the correct 401 response.
            log.warn("event=auth_login_failed reason={}", ex.getClass().getSimpleName());
            throw ex;
        }
        User user = users.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));
        log.info("event=auth_login_success user_id={}", user.getId());
        return createTokenResponse(user);
    }

    @Override
    public AuthResponse refresh(RefreshTokenRequest request) {
        String rawToken = request.refreshToken();
        try {
            if (!jwtUtil.isValidRefreshToken(rawToken)) {
                throw new TokenRefreshException("Invalid refresh token");
            }

            RefreshToken storedToken = refreshTokens.findByTokenHash(hash(rawToken))
                    .orElseThrow(() -> new TokenRefreshException("Refresh token was not found"));

            if (storedToken.isRevoked() || storedToken.getExpiresAt().isBefore(Instant.now())) {
                throw new TokenRefreshException("Refresh token is expired or revoked");
            }

            String email = jwtUtil.extractUsername(rawToken);
            if (!storedToken.getUser().getEmail().equals(email) || !storedToken.getUser().isEnabled()) {
                throw new TokenRefreshException("Refresh token is invalid");
            }

            storedToken.setRevoked(true);
            refreshTokens.save(storedToken);
            log.info("event=auth_token_refresh user_id={}", storedToken.getUser().getId());
            return createTokenResponse(storedToken.getUser());
        } catch (TokenRefreshException exception) {
            log.warn("event=auth_token_refresh_failed reason={}", exception.getMessage());
            throw exception;
        } catch (Exception exception) {
            log.warn("event=auth_token_refresh_error type={}", exception.getClass().getSimpleName());
            throw new TokenRefreshException("Invalid or expired refresh token");
        }
    }

    @Override
    public void logout(LogoutRequest request) {
        refreshTokens.findByTokenHash(hash(request.refreshToken())).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokens.save(token);
            log.info("event=auth_logout user_id={}", token.getUser().getId());
        });
    }

    private AuthResponse createTokenResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateAccessToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setTokenHash(hash(refreshToken));
        storedToken.setExpiresAt(jwtUtil.extractExpiration(refreshToken));
        refreshTokens.save(storedToken);

        Set<String> roles = user.getRoles().stream()
                .map(Enum::name)
                .collect(Collectors.toSet());

        return new AuthResponse(
                accessToken,
                accessToken,
                refreshToken,
                "Bearer",
                accessExpirationMs / 1000,
                user.getId(),
                user.getName(),
                user.getEmail(),
                roles,
                user.getVerificationStatus().name()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash refresh token", exception);
        }
    }
}
