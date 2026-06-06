package com.campusshare.controller;

import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.dto.MarketplaceDtos.QrVerifyRequest;
import com.campusshare.service.QrGenerationService;
import com.campusshare.service.QrVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrGenerationService qrGenerationService;
    private final QrVerificationService qrVerificationService;

    @GetMapping(value = "/{token}", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] qr(@PathVariable String token) {
        return qrGenerationService.renderQrPng(token);
    }

    @GetMapping(value = "/orders/{orderId}", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] orderQr(Authentication authentication, @PathVariable Long orderId) {
        return qrGenerationService.generateOrderQr(authentication.getName(), orderId);
    }

    @PostMapping("/verify")
    public MarketplaceOrder verify(Authentication authentication, @Valid @RequestBody QrVerifyRequest request) {
        return qrVerificationService.verify(authentication.getName(), request.token());
    }
}
