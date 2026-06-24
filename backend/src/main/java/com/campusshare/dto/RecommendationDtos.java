package com.campusshare.dto;

import java.time.Instant;

public final class RecommendationDtos {
    private RecommendationDtos() {
    }

    public record RecommendedNoteResponse(
            Long score,
            String reason,
            NoteDtos.NoteResponse note) {
    }

    public record RecommendedProductResponse(
            Long score,
            String reason,
            ProductDtos.ProductResponse product) {
    }

    public record RecommendationStatsResponse(
            int noteSignals,
            int productSignals,
            Instant generatedAt) {
    }
}
