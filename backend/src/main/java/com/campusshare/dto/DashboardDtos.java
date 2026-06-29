package com.campusshare.dto;

import java.time.Instant;
import java.util.List;

public final class DashboardDtos {
    private DashboardDtos() {
    }

    public record PageResponse<T>(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages) {
    }

    public record TrendingNoteResponse(
            Long score,
            String reason,
            NoteDtos.NoteResponse note) {
    }

    public record PersonalizedDashboardResponse(
            PageResponse<RecommendationDtos.RecommendedNoteResponse> recommendedNotes,
            PageResponse<RecommendationDtos.RecommendedProductResponse> recommendedProducts,
            PageResponse<NoteDtos.NoteResponse> recentDownloads,
            PageResponse<NoteDtos.NoteResponse> bookmarkedNotes,
            PageResponse<TrendingNoteResponse> trendingNotes,
            PageResponse<ContentDtos.NotificationResponse> recentNotifications,
            Instant generatedAt) {
    }
}
