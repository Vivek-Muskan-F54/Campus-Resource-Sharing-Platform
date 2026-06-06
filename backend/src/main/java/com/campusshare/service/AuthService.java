package com.campusshare.service;
import com.campusshare.dto.AuthDtos.*;
public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refresh(RefreshTokenRequest request);
    void logout(LogoutRequest request);
}
