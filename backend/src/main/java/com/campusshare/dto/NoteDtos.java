package com.campusshare.dto;

import com.campusshare.domain.Enums.ModerationStatus;
import jakarta.validation.constraints.*;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;

public final class NoteDtos {
    private NoteDtos() {
    }

    public record NoteCreateRequest(
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 80) String branch,
            @NotNull @Min(1) @Max(12) Integer semester,
            @NotBlank @Size(max = 100) String subject,
            @URL String fileUrl) {
    }

    public record NoteResponse(
            Long id,
            String title,
            String branch,
            Integer semester,
            String subject,
            String fileUrl,
            String originalFilename,
            Long fileSize,
            ModerationStatus status,
            long downloadCount,
            Long uploaderId,
            String uploaderName,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record NoteModerationRequest(
            @NotNull ModerationStatus status,
            @Size(max = 500) String remarks) {
    }
}
