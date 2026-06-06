package com.campusshare.dto;

import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.VerificationStatus;
import jakarta.validation.constraints.*;

import java.time.Instant;

public final class ContentDtos {
    private ContentDtos() {}

    // ── Verification requests / responses ────────────────────────────────────

    public record VerificationRequest(
            @NotBlank(message = "idCardUrl is required")
            @jakarta.validation.constraints.Pattern(
                regexp = "^https://.*",
                message = "idCardUrl must be a secure HTTPS URL"
            )
            String idCardUrl
    ) {}

    /**
     * Safe verification response – excludes raw student entity.
     */
    public record VerificationResponse(
            Long id,
            Long studentId,
            String studentName,
            String studentEmail,
            /** idCardUrl is included for admin views; student's own view hides nothing but the field is still safe */
            String idCardUrl,
            VerificationStatus status,
            String adminRemarks,
            Instant reviewedAt,
            String reviewedByName,
            Instant createdAt,
            Instant updatedAt
    ) {}

    // ── Notification response ────────────────────────────────────────────────

    /**
     * Safe notification DTO – excludes the full recipient entity.
     */
    public record NotificationResponse(
            Long id,
            NotificationType type,
            String message,
            String link,
            boolean readFlag,
            Instant createdAt
    ) {}

    public record UnreadCountResponse(long count) {}

    // ── Legacy / other content DTOs ──────────────────────────────────────────

    public record ModerationRequest(
            @NotBlank(message = "Status is required") String status,
            @Size(max = 500) String remarks
    ) {}

    public record NoteRequest(
            @NotBlank String title,
            @NotBlank String subject,
            @Min(1) @Max(12) Integer semester,
            @NotBlank String fileUrl
    ) {}

    public record ChatRequest(
            @NotNull Long recipientId,
            Long productId,
            Long listingId,
            @NotBlank String content
    ) {
        public Long effectiveProductId() {
            return productId != null ? productId : listingId;
        }
    }
}
