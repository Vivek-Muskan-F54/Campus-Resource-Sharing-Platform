package com.campusshare.dto;

import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.dto.ProductDtos.ProductResponse;
import jakarta.validation.constraints.*;

import java.time.Instant;

public final class MarketplaceDtos {
    private MarketplaceDtos() {}

    // ── Requests ─────────────────────────────────────────────────────────────

    public record OrderRequest(Long productId, Long listingId) {
        @AssertTrue(message = "productId is required")
        public boolean hasProductId() {
            return productId != null || listingId != null;
        }

        public Long effectiveProductId() {
            return productId != null ? productId : listingId;
        }
    }

    public record StatusRequest(
            @NotBlank(message = "Status is required") String status
    ) {}

    public record QrVerifyRequest(
            @NotBlank(message = "Token is required") String token
    ) {}

    public record ReviewRequest(
            @NotNull(message = "orderId is required") Long orderId,
            @Min(value = 1, message = "Rating must be at least 1")
            @Max(value = 5, message = "Rating must be at most 5") int rating,
            @NotBlank(message = "Comment is required")
            @Size(max = 1000, message = "Comment must not exceed 1000 characters") String comment
    ) {}

    // ── Responses ─────────────────────────────────────────────────────────────

    /**
     * Flattened order response – never exposes full entity graph.
     * Sensitive fields (handoverTokenHash) are intentionally excluded.
     */
    public record OrderResponse(
            Long id,
            OrderStatus status,
            // product summary
            Long productId,
            String productTitle,
            String productImageUrl,
            // participants – only expose names and IDs, never passwords/tokens
            Long buyerId,
            String buyerName,
            Long sellerId,
            String sellerName,
            Instant completedAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    /**
     * Review response DTO – no sensitive nested entities.
     */
    public record ReviewResponse(
            Long id,
            Long orderId,
            Long reviewerId,
            String reviewerName,
            Long revieweeId,
            String revieweeName,
            int rating,
            String comment,
            Instant createdAt
    ) {}
}
