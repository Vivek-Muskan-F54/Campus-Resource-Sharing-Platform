package com.campusshare.dto;

import jakarta.validation.constraints.*;
import java.util.Set;

/**
 * DTOs for authentication endpoints.
 * Passwords never appear in responses – only in request records.
 */
public final class AuthDtos {
    private AuthDtos() {}

    // ── Requests ────────────────────────────────────────────────────────────

    public record RegisterRequest(
            @NotBlank(message = "Name is required")
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,

            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email address")
            @Size(max = 150, message = "Email must not exceed 150 characters")
            String email,

            /**
             * Production password policy:
             *  - minimum 8 characters
             *  - at least one uppercase letter
             *  - at least one lowercase letter
             *  - at least one digit
             *  - at least one special character
             */
            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).+$",
                message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
            )
            String password,

            @NotBlank(message = "College roll number is required")
            @Size(min = 2, max = 30, message = "Roll number must be between 2 and 30 characters")
            @Pattern(regexp = "^[A-Za-z0-9/_-]+$", message = "Roll number may only contain letters, digits, /, _ and -")
            String collegeRollNumber
    ) {}

    public record VerifyEmailRequest(
            @NotBlank(message = "Token is required")
            String token
    ) {}

    public record ResendVerificationRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email address")
            String email
    ) {}

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email address")
            @Size(max = 150, message = "Email must not exceed 150 characters")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Token is required")
            String token,

            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
            @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).+$",
                message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
            )
            String password,

            @NotBlank(message = "Password confirmation is required")
            String confirmPassword
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Must be a valid email address")
            String email,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record RefreshTokenRequest(
            @NotBlank(message = "Refresh token is required")
            String refreshToken
    ) {}

    public record LogoutRequest(
            @NotBlank(message = "Refresh token is required")
            String refreshToken
    ) {}

    // ── Responses ────────────────────────────────────────────────────────────

    /**
     * Returned after successful login, register, or token refresh.
     * Both {@code token} and {@code accessToken} carry the same value
     * for backward compatibility with older frontend code.
     * <p>
     * Passwords, internal IDs of stored tokens, and other sensitive
     * fields are intentionally excluded.
     */
    public record AuthResponse(
            String token,          // kept for backwards-compat
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresIn,        // seconds until access token expiry
            Long id,
            String name,
            String email,
            Set<String> roles,
            String verificationStatus
    ) {}
}
