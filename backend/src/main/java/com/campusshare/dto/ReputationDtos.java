package com.campusshare.dto;

import java.time.Instant;
import java.util.List;

public final class ReputationDtos {
    private ReputationDtos() {
    }

    public record ReputationProgressResponse(
            long currentScore,
            Long nextThreshold,
            int percent,
            String nextLevel) {
    }

    public record ReputationResponse(
            Long userId,
            String userName,
            long score,
            String level,
            String badge,
            ReputationProgressResponse progress,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record LeaderboardEntryResponse(
            Long userId,
            String userName,
            long score,
            String level,
            String badge,
            long metric) {
    }

    public record LeaderboardResponse(
            List<LeaderboardEntryResponse> topContributors,
            List<LeaderboardEntryResponse> topNoteUploaders,
            List<LeaderboardEntryResponse> topSellers,
            Instant generatedAt) {
    }
}
