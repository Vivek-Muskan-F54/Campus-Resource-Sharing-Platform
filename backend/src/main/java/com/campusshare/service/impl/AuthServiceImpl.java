package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.common.TokenRefreshException;
import com.campusshare.domain.AuthToken;
import com.campusshare.domain.Enums.AuthTokenPurpose;
import com.campusshare.domain.RefreshToken;
import com.campusshare.domain.User;
import com.campusshare.dto.AuthDtos.*;
import com.campusshare.repository.AuthTokenRepository;
import com.campusshare.repository.RefreshTokenRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.security.JwtUtil;
import com.campusshare.service.AuthMailService;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final AuthTokenRepository authTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final AuthMailService authMailService;

    @Value("${app.jwt.access-expiration-ms}")
    private long accessExpirationMs;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.auth.email-verification-expiration-ms}")
    private long emailVerificationExpirationMs;

    @Value("${app.auth.password-reset-expiration-ms}")
    private long passwordResetExpirationMs;

    @Override
    public void register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setCollegeRollNumber(request.collegeRollNumber().trim());
        user.setEmailVerified(false);

        User saved = users.save(user);
        String verificationToken = issueToken(saved, AuthTokenPurpose.EMAIL_VERIFICATION, emailVerificationExpirationMs);
        authMailService.sendVerificationEmail(saved, buildFrontendUrl("/verify-email", verificationToken));
        log.info("event=auth_registration user_id={}", saved.getId());
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = users.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!isEmailVerified(user)) {
            throw new BadRequestException("Please verify your email address before signing in");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (Exception ex) {
            log.warn("event=auth_login_failed reason={} user_id={}", ex.getClass().getSimpleName(), user.getId());
            throw ex;
        }

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
            if (!storedToken.getUser().getEmail().equals(email)
                    || !storedToken.getUser().isEnabled()
                    || !isEmailVerified(storedToken.getUser())) {
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
    @Transactional(readOnly = true)
    public MeResponse me(String email) {
        User user = users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Set<String> roles = user.getRoles().stream()
                .map(Enum::name)
                .collect(Collectors.toSet());

        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                roles,
                user.getVerificationStatus().name(),
                user.isEnabled()
        );
    }

    @Override
    public void logout(LogoutRequest request) {
        refreshTokens.findByTokenHash(hash(request.refreshToken())).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokens.save(token);
            log.info("event=auth_logout user_id={}", token.getUser().getId());
        });
    }

    @Override
    public void verifyEmail(VerifyEmailRequest request) {
        AuthToken token = consumeToken(request.token(), AuthTokenPurpose.EMAIL_VERIFICATION);
        User user = token.getUser();
        user.setEmailVerified(true);
        users.save(user);
        log.info("event=auth_email_verified user_id={}", user.getId());
    }

    @Override
    public void resendVerification(ResendVerificationRequest request) {
        String email = normalizeEmail(request.email());
        users.findByEmail(email).ifPresent(user -> {
            if (isEmailVerified(user)) {
                return;
            }
            String verificationToken = issueToken(user, AuthTokenPurpose.EMAIL_VERIFICATION, emailVerificationExpirationMs);
            authMailService.sendVerificationEmail(user, buildFrontendUrl("/verify-email", verificationToken));
        });
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        users.findByEmail(email).ifPresent(user -> {
            if (!user.isEnabled()) {
                return;
            }

            if (!isEmailVerified(user)) {
                String verificationToken = issueToken(user, AuthTokenPurpose.EMAIL_VERIFICATION, emailVerificationExpirationMs);
                authMailService.sendVerificationEmail(user, buildFrontendUrl("/verify-email", verificationToken));
                return;
            }

            String resetToken = issueToken(user, AuthTokenPurpose.PASSWORD_RESET, passwordResetExpirationMs);
            authMailService.sendPasswordResetEmail(user, buildFrontendUrl("/reset-password", resetToken));
        });
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        AuthToken token = consumeToken(request.token(), AuthTokenPurpose.PASSWORD_RESET);
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.password()));
        users.save(user);
        refreshTokens.revokeAllByUserId(user.getId());
        log.info("event=auth_password_reset user_id={}", user.getId());
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

    private AuthToken consumeToken(String rawToken, AuthTokenPurpose purpose) {
        String tokenHash = hash(rawToken.trim());
        AuthToken token = authTokens.findByTokenHashAndPurpose(tokenHash, purpose)
                .orElseThrow(() -> new BadRequestException("Token is invalid or expired"));

        Instant now = Instant.now();
        if (token.isRevoked() || token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Token is invalid or expired");
        }

        token.setUsedAt(now);
        token.setRevoked(true);
        authTokens.save(token);
        return token;
    }

    private String issueToken(User user, AuthTokenPurpose purpose, long ttlMs) {
        authTokens.revokeAllByUserIdAndPurpose(user.getId(), purpose);
        authTokens.deleteByExpiresAtBefore(Instant.now());

        String rawToken = generateSecureToken();
        AuthToken token = new AuthToken();
        token.setUser(user);
        token.setPurpose(purpose);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(Instant.now().plusMillis(ttlMs));
        authTokens.save(token);
        return rawToken;
    }

    private String buildFrontendUrl(String path, String token) {
        return UriComponentsBuilder.fromHttpUrl(frontendUrl)
                .path(path)
                .queryParam("token", token)
                .toUriString();
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isEmailVerified(User user) {
        return user.getEmailVerified() == null || user.getEmailVerified();
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash token", exception);
        }
    }
}
