package com.campusshare.dto;

import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public final class UserActivityDtos {
    private UserActivityDtos() {
    }

    public record UserActivityCreateRequest(
            @NotNull ActivityType activityType,
            @NotNull ActivityEntityType entityType,
            Long entityId,
            @Size(max = 4000) Map<String, Object> metadata) {
    }

    public record UserActivityResponse(
            Long id,
            Long userId,
            String userName,
            ActivityType activityType,
            ActivityEntityType entityType,
            Long entityId,
            Map<String, Object> metadata,
            Instant createdAt) {
    }
}
