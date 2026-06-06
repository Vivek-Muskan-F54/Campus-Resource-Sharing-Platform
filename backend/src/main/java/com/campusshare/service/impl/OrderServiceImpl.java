package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.*;
import com.campusshare.domain.Enums.*;
import com.campusshare.dto.MarketplaceDtos.OrderResponse;
import com.campusshare.repository.*;
import com.campusshare.service.OrderService;
import com.campusshare.service.QrGenerationService;
import com.campusshare.service.QrVerificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orders;
    private final ProductRepository products;
    private final UserRepository users;
    private final NotificationRepository notifications;
    private final QrGenerationService qrGenerationService;
    private final QrVerificationService qrVerificationService;

    @Override
    public OrderResponse request(String email, Long productId) {
        User buyer = findUser(email);
        Product product = products.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (product.getSeller().getId().equals(buyer.getId())) {
            throw new BadRequestException("Cannot request your own product");
        }
        if (product.getStatus() != ListingStatus.ACTIVE) {
            throw new BadRequestException("This product is no longer available");
        }

        MarketplaceOrder order = new MarketplaceOrder();
        order.setProduct(product);
        order.setBuyer(buyer);
        order.setSeller(product.getSeller());

        MarketplaceOrder saved = orders.save(order);
        notify(product.getSeller(), NotificationType.ORDER,
                "New order request for " + product.getTitle(), "/orders");

        log.info("Order created: id={} product={} buyer={}", saved.getId(), productId, buyer.getId());
        return toResponse(saved);
    }

    @Override
    public OrderResponse status(String email, Long id, String status) {
        MarketplaceOrder order = findOrder(id);
        OrderStatus next;
        try {
            next = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }

        // Authorization: only buyer or seller may change status
        boolean isSeller = order.getSeller().getEmail().equalsIgnoreCase(email);
        boolean isBuyer  = order.getBuyer().getEmail().equalsIgnoreCase(email);
        if (!isSeller && !isBuyer) {
            throw new BadRequestException("You are not a participant in this order");
        }

        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new BadRequestException("Completed orders cannot be changed");
        }
        if (next == OrderStatus.COMPLETED) {
            throw new BadRequestException("Use QR verification to complete the order");
        }

        // Transition guards
        if (next == OrderStatus.APPROVED && order.getStatus() != OrderStatus.REQUESTED) {
            throw new BadRequestException("Only REQUESTED orders can be approved");
        }
        if (next == OrderStatus.READY_FOR_HANDOVER && order.getStatus() != OrderStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED orders can move to READY_FOR_HANDOVER");
        }
        if (next == OrderStatus.CANCELLED
                && order.getStatus() == OrderStatus.READY_FOR_HANDOVER) {
            throw new BadRequestException("Orders ready for handover cannot be cancelled");
        }
        if (next == OrderStatus.REJECTED && !isSeller) {
            throw new BadRequestException("Only the seller can reject an order");
        }

        order.setStatus(next);
        if (next == OrderStatus.READY_FOR_HANDOVER) {
            String token = qrGenerationService.issueToken(order);
            order.setHandoverTokenHash(qrGenerationService.sha256(token));
        }

        notify(order.getBuyer(), NotificationType.ORDER,
                "Your order status changed to " + next.name(), "/orders");

        log.info("Order status updated: id={} status={} actor={}", id, next, email);
        return toResponse(orders.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> mine(String email, Pageable pageable) {
        User user = findUser(email);
        return orders.findByBuyerIdOrSellerId(user.getId(), user.getId(), pageable)
                .map(this::toResponse);
    }

    @Override
    public OrderResponse verifyHandover(String email, String token) {
        MarketplaceOrder completed = qrVerificationService.verify(email, token);
        log.info("QR handover completed: orderId={} actor={}", completed.getId(), email);
        return toResponse(completed);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private OrderResponse toResponse(MarketplaceOrder order) {
        Product product = order.getProduct();
        String coverImage = (product.getImages() != null && !product.getImages().isEmpty())
                ? product.getImages().get(0).getImageUrl()
                : null;

        return new OrderResponse(
                order.getId(),
                order.getStatus(),
                product.getId(),
                product.getTitle(),
                coverImage,
                order.getBuyer().getId(),
                order.getBuyer().getName(),
                order.getSeller().getId(),
                order.getSeller().getName(),
                order.getCompletedAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private MarketplaceOrder findOrder(Long id) {
        return orders.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    private User findUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void notify(User recipient, NotificationType type, String message, String link) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setMessage(message);
        notification.setLink(link);
        notifications.save(notification);
    }
}
