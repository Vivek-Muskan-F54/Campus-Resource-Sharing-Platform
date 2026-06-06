package com.campusshare.controller;

import com.campusshare.dto.MarketplaceDtos.OrderResponse;
import com.campusshare.dto.MarketplaceDtos.QrVerifyRequest;
import com.campusshare.service.OrderService;
import com.campusshare.service.QrGenerationService;
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
    private final OrderService orderService;

    /** Render a raw token as a PNG QR code image (used internally by the frontend). */
    @GetMapping(value = "/{token}", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] renderQr(@PathVariable String token) {
        return qrGenerationService.renderQrPng(token);
    }

    /** Generate and return the handover QR code PNG for a specific order. */
    @GetMapping(value = "/orders/{orderId}", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] orderQr(Authentication authentication, @PathVariable Long orderId) {
        return qrGenerationService.generateOrderQr(authentication.getName(), orderId);
    }

    /**
     * Verify the scanned QR token and complete the order.
     * Returns a safe {@link OrderResponse} DTO — never the raw entity.
     */
    @PostMapping("/verify")
    public OrderResponse verify(
            Authentication authentication,
            @Valid @RequestBody QrVerifyRequest request) {
        return orderService.verifyHandover(authentication.getName(), request.token());
    }
}
