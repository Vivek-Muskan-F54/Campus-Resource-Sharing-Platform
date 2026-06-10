package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.domain.Notification;
import com.campusshare.domain.User;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.QrGenerationService;
import com.campusshare.service.QrVerificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class QrVerificationServiceImpl implements QrVerificationService {

    private static final Logger log = LoggerFactory.getLogger(QrVerificationServiceImpl.class);

    private final OrderRepository orders;
    private final UserRepository users;
    private final NotificationRepository notifications;
    private final QrGenerationService qrGenerationService;

    @Override
    public MarketplaceOrder verify(String email, String token) {
        ParsedToken parsed = parse(token);
        MarketplaceOrder order = orders.findById(parsed.orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        User actor = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!OrderStatus.READY_FOR_HANDOVER.name().equals(parsed.status)) {
            throw new BadRequestException("This QR code is not for handover completion");
        }
        String expected = qrGenerationService.issueToken(order);
        if (!expected.equals(token)) {
            throw new BadRequestException("Invalid QR code");
        }
        if (order.getHandoverTokenHash() != null && !Objects.equals(order.getHandoverTokenHash(), qrGenerationService.sha256(token))) {
            throw new BadRequestException("QR token verification failed");
        }
        if (!Objects.equals(order.getBuyer().getId(), parsed.buyerId) || !Objects.equals(order.getSeller().getId(), parsed.sellerId)) {
            throw new BadRequestException("QR token does not match this order");
        }
        if (!Objects.equals(order.getSeller().getId(), actor.getId())) {
            throw new BadRequestException("Only the seller can complete this order");
        }
        if (order.getStatus() != OrderStatus.READY_FOR_HANDOVER) {
            throw new BadRequestException("Order is not ready for QR verification");
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(Instant.now());
        order.setHandoverTokenHash(null);
        order.getProduct().setStatus(ListingStatus.COMPLETED);
        notify(order.getBuyer(), NotificationType.ORDER, "Order completed via QR verification", "/orders");
        log.info("event=order_completed_via_qr order_id={} seller_id={} buyer_id={}",
                order.getId(), order.getSeller().getId(), order.getBuyer().getId());
        return orders.save(order);
    }

    private ParsedToken parse(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("QR token is required");
        }
        String[] parts = token.split(":");
        if (parts.length != 5) {
            throw new BadRequestException("Invalid QR token");
        }
        try {
            return new ParsedToken(
                    Long.parseLong(parts[0]),
                    Long.parseLong(parts[1]),
                    Long.parseLong(parts[2]),
                    parts[3],
                    parts[4]
            );
        } catch (NumberFormatException ex) {
            throw new BadRequestException("Invalid QR token");
        }
    }

    private void notify(User recipient, NotificationType type, String message, String link) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setMessage(message);
        notification.setLink(link);
        notifications.save(notification);
    }

    private record ParsedToken(Long orderId, Long buyerId, Long sellerId, String status, String signature) {}
}
