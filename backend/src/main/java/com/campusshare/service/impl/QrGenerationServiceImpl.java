package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.domain.User;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.QrGenerationService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Objects;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
public class QrGenerationServiceImpl implements QrGenerationService {

    private final OrderRepository orders;
    private final UserRepository users;

    @Value("${campusshare.qr.secret:${campusshare.jwt.secret:CampusResourceSharingQrSecretChangeMe}}")
    private String secret;

    @Override
    public String issueToken(MarketplaceOrder order) {
        if (order == null || order.getId() == null) {
            throw new BadRequestException("Order is required to issue a QR token");
        }
        if (order.getStatus() != OrderStatus.READY_FOR_HANDOVER) {
            throw new BadRequestException("QR token can only be issued for orders ready for handover");
        }
        return buildToken(order);
    }

    @Override
    public String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BadRequestException("Unable to hash QR token");
        }
    }

    @Override
    public byte[] renderQrPng(String token) {
        try {
            var matrix = new QRCodeWriter().encode(token, BarcodeFormat.QR_CODE, 320, 320);
            var out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return out.toByteArray();
        } catch (WriterException | java.io.IOException ex) {
            throw new BadRequestException("Unable to render QR code");
        }
    }

    @Override
    public byte[] generateOrderQr(String email, Long orderId) {
        MarketplaceOrder order = orders.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        ensureParticipant(email, order);
        if (order.getStatus() != OrderStatus.READY_FOR_HANDOVER) {
            throw new BadRequestException("QR is available only when the order is ready for handover");
        }
        return renderQrPng(buildToken(order));
    }

    private void ensureParticipant(String email, MarketplaceOrder order) {
        User user = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean participant = Objects.equals(order.getBuyer().getId(), user.getId())
                || Objects.equals(order.getSeller().getId(), user.getId());
        if (!participant) {
            throw new BadRequestException("You are not allowed to view this QR");
        }
    }

    private String buildToken(MarketplaceOrder order) {
        String payload = order.getId() + ":" + order.getBuyer().getId() + ":" + order.getSeller().getId() + ":" + OrderStatus.READY_FOR_HANDOVER.name();
        return payload + ":" + sign(payload);
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BadRequestException("Unable to sign QR token");
        }
    }
}
