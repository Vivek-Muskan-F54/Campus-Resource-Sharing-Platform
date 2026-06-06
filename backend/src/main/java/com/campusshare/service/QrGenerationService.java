package com.campusshare.service;

import com.campusshare.domain.MarketplaceOrder;

public interface QrGenerationService {
    String issueToken(MarketplaceOrder order);
    String sha256(String value);
    byte[] renderQrPng(String token);
    byte[] generateOrderQr(String email, Long orderId);
}
