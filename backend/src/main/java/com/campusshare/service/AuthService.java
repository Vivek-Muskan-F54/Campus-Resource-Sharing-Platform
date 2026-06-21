package com.campusshare.service;
import com.campusshare.dto.AuthDtos.*;
public interface AuthService {
    void register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refresh(RefreshTokenRequest request);
    MeResponse me(String email);
    void logout(LogoutRequest request);
    void verifyEmail(VerifyEmailRequest request);
    void resendVerification(ResendVerificationRequest request);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}
