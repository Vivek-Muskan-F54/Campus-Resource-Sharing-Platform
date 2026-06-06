package com.campusshare.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link JwtUtil}.
 *
 * Covers:
 *  - Access token generation and validation
 *  - Refresh token generation and validation
 *  - Token-type substitution attack prevention (access token rejected as refresh and vice-versa)
 *  - Username extraction
 *  - Expiration extraction
 */
class JwtUtilTest {

    // Minimum 32-byte secret for tests
    private static final String SECRET =
            "test-secret-at-least-32-bytes-long!!";
    private static final long ACCESS_EXP_MS  = 900_000L;   // 15 min
    private static final long REFRESH_EXP_MS = 604_800_000L; // 7 days

    private JwtUtil jwtUtil;
    private UserDetails studentDetails;
    private UserDetails adminDetails;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, ACCESS_EXP_MS, REFRESH_EXP_MS);

        studentDetails = User.withUsername("student@college.edu")
                .password("irrelevant")
                .roles("STUDENT")
                .build();

        adminDetails = User.withUsername("admin@college.edu")
                .password("irrelevant")
                .roles("ADMIN")
                .build();
    }

    // ── Access token ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("generateAccessToken returns a non-blank token")
    void generateAccessToken_notBlank() {
        String token = jwtUtil.generateAccessToken(studentDetails);
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("isValidAccessToken returns true for a fresh access token")
    void isValidAccessToken_freshToken_isValid() {
        String token = jwtUtil.generateAccessToken(studentDetails);
        assertThat(jwtUtil.isValidAccessToken(token, studentDetails)).isTrue();
    }

    @Test
    @DisplayName("isValidAccessToken returns false when UserDetails email does not match")
    void isValidAccessToken_wrongUser_invalid() {
        String token = jwtUtil.generateAccessToken(studentDetails);
        assertThat(jwtUtil.isValidAccessToken(token, adminDetails)).isFalse();
    }

    @Test
    @DisplayName("isValidAccessToken returns false when token is a refresh token (type substitution)")
    void isValidAccessToken_refreshTokenRejectedAsAccess() {
        String refreshToken = jwtUtil.generateRefreshToken(studentDetails);
        // A refresh token must NOT pass access-token validation
        assertThat(jwtUtil.isValidAccessToken(refreshToken, studentDetails)).isFalse();
    }

    // ── Refresh token ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("generateRefreshToken returns a non-blank token")
    void generateRefreshToken_notBlank() {
        String token = jwtUtil.generateRefreshToken(studentDetails);
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("isValidRefreshToken returns true for a fresh refresh token")
    void isValidRefreshToken_freshToken_isValid() {
        String token = jwtUtil.generateRefreshToken(studentDetails);
        assertThat(jwtUtil.isValidRefreshToken(token)).isTrue();
    }

    @Test
    @DisplayName("isValidRefreshToken returns false when token is an access token (type substitution)")
    void isValidRefreshToken_accessTokenRejectedAsRefresh() {
        String accessToken = jwtUtil.generateAccessToken(studentDetails);
        // An access token must NOT pass refresh-token validation
        assertThat(jwtUtil.isValidRefreshToken(accessToken)).isFalse();
    }

    // ── Claims extraction ──────────────────────────────────────────────────────

    @Test
    @DisplayName("extractUsername returns the subject from an access token")
    void extractUsername_accessToken() {
        String token = jwtUtil.generateAccessToken(studentDetails);
        assertThat(jwtUtil.extractUsername(token))
                .isEqualTo("student@college.edu");
    }

    @Test
    @DisplayName("extractUsername returns the subject from a refresh token")
    void extractUsername_refreshToken() {
        String token = jwtUtil.generateRefreshToken(studentDetails);
        assertThat(jwtUtil.extractUsername(token))
                .isEqualTo("student@college.edu");
    }

    @Test
    @DisplayName("extractExpiration returns a future instant for a fresh access token")
    void extractExpiration_futureInstant() {
        String token = jwtUtil.generateAccessToken(studentDetails);
        assertThat(jwtUtil.extractExpiration(token))
                .isAfter(java.time.Instant.now());
    }

    // ── Security edge cases ───────────────────────────────────────────────────

    @Test
    @DisplayName("Invalid / tampered token throws an exception on extraction")
    void extractUsername_invalidToken_throws() {
        assertThatThrownBy(() -> jwtUtil.extractUsername("not.a.valid.jwt"))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("JwtUtil constructor rejects a secret shorter than 32 bytes")
    void constructor_shortSecret_throws() {
        assertThatThrownBy(() -> new JwtUtil("tooshort", ACCESS_EXP_MS, REFRESH_EXP_MS))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("32");
    }

    @Test
    @DisplayName("Two access tokens for the same user are different (unique JTI)")
    void generateAccessToken_twoTokensAreDifferent() {
        String t1 = jwtUtil.generateAccessToken(studentDetails);
        String t2 = jwtUtil.generateAccessToken(studentDetails);
        assertThat(t1).isNotEqualTo(t2);
    }
}
