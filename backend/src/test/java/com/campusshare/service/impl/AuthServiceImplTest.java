package com.campusshare.service.impl;

import com.campusshare.domain.AuthToken;
import com.campusshare.domain.Enums.AuthTokenPurpose;
import com.campusshare.common.TokenRefreshException;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.domain.RefreshToken;
import com.campusshare.domain.User;
import com.campusshare.dto.AuthDtos.*;
import com.campusshare.repository.AuthTokenRepository;
import com.campusshare.repository.RefreshTokenRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.security.JwtUtil;
import com.campusshare.service.AuthMailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class AuthServiceImplTest {

    private static final String EMAIL = "student@campus.edu";
    private static final String NORMALIZED_EMAIL = EMAIL;
    private static final String PASSWORD = "Passw0rd!";
    private static final String ACCESS_TOKEN = "access-token";
    private static final String REFRESH_TOKEN = "refresh-token";
    private static final String NEW_ACCESS_TOKEN = "new-access-token";
    private static final String NEW_REFRESH_TOKEN = "new-refresh-token";
    private static final long ACCESS_EXPIRATION_MS = 900_000L;

    @Mock private UserRepository users;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private AuthTokenRepository authTokens;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserDetailsService userDetailsService;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthMailService authMailService;

    @InjectMocks private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessExpirationMs", ACCESS_EXPIRATION_MS);
        ReflectionTestUtils.setField(authService, "frontendUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(authService, "emailVerificationExpirationMs", 86_400_000L);
        ReflectionTestUtils.setField(authService, "passwordResetExpirationMs", 1_800_000L);
    }

    @Test
    @DisplayName("register creates a student, encodes the password, and sends verification email")
    void register_createsUserAndSendsVerificationEmail() {
        RegisterRequest request = new RegisterRequest("  Student One  ", "Student@Campus.edu", PASSWORD, "  CS/001  ");

        when(users.existsByEmailIgnoreCase(NORMALIZED_EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(PASSWORD)).thenReturn("encoded-password");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(11L);
            return user;
        });
        when(authTokens.revokeAllByUserIdAndPurpose(anyLong(), eq(AuthTokenPurpose.EMAIL_VERIFICATION))).thenReturn(0);
        when(authTokens.save(any(AuthToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<AuthToken> tokenCaptor = ArgumentCaptor.forClass(AuthToken.class);
        verify(users).existsByEmailIgnoreCase(NORMALIZED_EMAIL);
        verify(users).save(userCaptor.capture());
        verify(authMailService).sendVerificationEmail(eq(userCaptor.getValue()), contains("/verify-email?token="));
        verify(authTokens).save(tokenCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getName()).isEqualTo("Student One");
        assertThat(savedUser.getEmail()).isEqualTo(NORMALIZED_EMAIL);
        assertThat(savedUser.getPassword()).isEqualTo("encoded-password");
        assertThat(savedUser.getCollegeRollNumber()).isEqualTo("CS/001");
        assertThat(savedUser.getEmailVerified()).isFalse();
        assertThat(tokenCaptor.getValue().getPurpose()).isEqualTo(AuthTokenPurpose.EMAIL_VERIFICATION);
        assertThat(tokenCaptor.getValue().getUser().getId()).isEqualTo(11L);
        assertThat(tokenCaptor.getValue().getTokenHash()).hasSize(64);
    }

    @Test
    @DisplayName("login authenticates a user and returns tokens")
    void login_returnsAuthResponse() {
        LoginRequest request = new LoginRequest("Student@Campus.edu", PASSWORD);
        UserDetails userDetails = securityUserDetails(EMAIL);
        User user = approvedUser(11L, "Student One", EMAIL);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mock(Authentication.class));
        when(users.findByEmailIgnoreCase(NORMALIZED_EMAIL)).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername(NORMALIZED_EMAIL)).thenReturn(userDetails);
        when(jwtUtil.generateAccessToken(userDetails)).thenReturn(ACCESS_TOKEN);
        when(jwtUtil.generateRefreshToken(userDetails)).thenReturn(REFRESH_TOKEN);
        when(jwtUtil.extractExpiration(REFRESH_TOKEN)).thenReturn(Instant.parse("2030-01-01T00:00:00Z"));
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.login(request);

        ArgumentCaptor<Authentication> authCaptor = ArgumentCaptor.forClass(Authentication.class);
        verify(authenticationManager).authenticate(authCaptor.capture());
        UsernamePasswordAuthenticationToken authToken = (UsernamePasswordAuthenticationToken) authCaptor.getValue();
        assertThat(authToken.getPrincipal()).isEqualTo(NORMALIZED_EMAIL);
        assertThat(authToken.getCredentials()).isEqualTo(PASSWORD);

        assertThat(response.email()).isEqualTo(NORMALIZED_EMAIL);
        assertThat(response.id()).isEqualTo(11L);
        assertThat(response.token()).isEqualTo(ACCESS_TOKEN);
        assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
        assertThat(response.roles()).containsExactly("STUDENT");
    }

    @Test
    @DisplayName("refresh revokes the stored token and returns a new token pair")
    void refresh_rotatesRefreshToken() {
        RefreshTokenRequest request = new RefreshTokenRequest(REFRESH_TOKEN);
        User user = approvedUser(11L, "Student One", EMAIL);
        UserDetails userDetails = securityUserDetails(EMAIL);
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(user);
        storedToken.setTokenHash(hash(REFRESH_TOKEN));
        storedToken.setExpiresAt(Instant.parse("2030-01-01T00:00:00Z"));

        when(jwtUtil.isValidRefreshToken(REFRESH_TOKEN)).thenReturn(true);
        when(refreshTokens.findByTokenHash(hash(REFRESH_TOKEN))).thenReturn(Optional.of(storedToken));
        when(jwtUtil.extractUsername(REFRESH_TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(userDetails);
        when(jwtUtil.generateAccessToken(userDetails)).thenReturn(NEW_ACCESS_TOKEN);
        when(jwtUtil.generateRefreshToken(userDetails)).thenReturn(NEW_REFRESH_TOKEN);
        when(jwtUtil.extractExpiration(NEW_REFRESH_TOKEN)).thenReturn(Instant.parse("2030-02-01T00:00:00Z"));
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.refresh(request);

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokens, times(2)).save(tokenCaptor.capture());

        assertThat(response.token()).isEqualTo(NEW_ACCESS_TOKEN);
        assertThat(response.refreshToken()).isEqualTo(NEW_REFRESH_TOKEN);
        assertThat(response.expiresIn()).isEqualTo(900L);
        assertThat(tokenCaptor.getAllValues()).hasSize(2);
        assertThat(tokenCaptor.getAllValues().get(0).isRevoked()).isTrue();
        assertThat(tokenCaptor.getAllValues().get(0).getTokenHash()).isEqualTo(hash(REFRESH_TOKEN));
        assertThat(tokenCaptor.getAllValues().get(1).getTokenHash()).isEqualTo(hash(NEW_REFRESH_TOKEN));
    }

    @Test
    @DisplayName("refresh rejects an invalid refresh token")
    void refresh_rejectsInvalidToken() {
        when(jwtUtil.isValidRefreshToken("bad-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest("bad-token")))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("Invalid refresh token");
    }

    @Test
    @DisplayName("logout revokes the matching refresh token")
    void logout_revokesRefreshToken() {
        RefreshToken storedToken = new RefreshToken();
        storedToken.setUser(approvedUser(11L, "Student One", EMAIL));
        storedToken.setTokenHash(hash(REFRESH_TOKEN));

        when(refreshTokens.findByTokenHash(hash(REFRESH_TOKEN))).thenReturn(Optional.of(storedToken));
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.logout(new LogoutRequest(REFRESH_TOKEN));

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokens).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().isRevoked()).isTrue();
        assertThat(tokenCaptor.getValue().getTokenHash()).isEqualTo(hash(REFRESH_TOKEN));
    }

    private static User approvedUser(Long id, String name, String email) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        user.setEmail(email);
        user.setPassword("password");
        user.setCollegeRollNumber("CS/001");
        user.setVerificationStatus(VerificationStatus.APPROVED);
        user.setRoles(Set.of(com.campusshare.domain.Enums.Role.STUDENT));
        return user;
    }

    private static UserDetails securityUserDetails(String email) {
        return org.springframework.security.core.userdetails.User.withUsername(email)
                .password("irrelevant")
                .roles("STUDENT")
                .build();
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
