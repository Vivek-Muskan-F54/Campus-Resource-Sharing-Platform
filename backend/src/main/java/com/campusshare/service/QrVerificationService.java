package com.campusshare.service;

import com.campusshare.domain.MarketplaceOrder;

public interface QrVerificationService {
    MarketplaceOrder verify(String email, String token);
}
