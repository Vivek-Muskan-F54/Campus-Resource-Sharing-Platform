package com.campusshare.dto;

import com.campusshare.domain.Enums.VerificationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.Set;

public final class AdminDtos {
    private AdminDtos() {
    }

    public record DashboardStatsResponse(
            long totalUsers,
            long activeUsers,
            long blockedUsers,
            long verifiedStudents,
            long pendingVerifications,
            long totalProducts,
            long activeProducts,
            long totalNotes,
            long approvedNotes,
            long totalOrders,
            long totalMessages) {
    }

    public record AdminUserResponse(
            Long id,
            String name,
            String email,
            String collegeRollNumber,
            boolean enabled,
            Set<String> roles,
            VerificationStatus verificationStatus,
            double averageRating,
            int ratingCount) {
    }

    public record VerificationActionRequest(
            @NotNull VerificationStatus status,
            String remarks) {
    }

    public record AdminVerificationResponse(
            Long id,
            Long studentId,
            String studentName,
            String studentEmail,
            String idCardUrl,
            VerificationStatus status,
            String adminRemarks,
            Instant reviewedAt,
            String reviewedBy) {
    }

    public record BlockUserRequest(@NotBlank String reason) {
    }
}
