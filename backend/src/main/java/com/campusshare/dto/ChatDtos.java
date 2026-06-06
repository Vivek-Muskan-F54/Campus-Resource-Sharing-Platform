package com.campusshare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class ChatDtos {
    private ChatDtos() {
    }

    public record OnlineUserResponse(Long id, String email, String name) {
    }

    public record MessageResponse(
            Long id,
            Long senderId,
            String senderName,
            Long recipientId,
            String recipientName,
            Long productId,
            String productTitle,
            String content,
            boolean readFlag,
            Instant readAt,
            Instant sentAt) {
    }

    public record ConversationResponse(
            Long otherUserId,
            String otherUserName,
            List<MessageResponse> messages) {
    }

    public record MarkReadRequest(@NotNull Long otherUserId) {
    }

    public record SendMessageRequest(@NotNull Long recipientId, @NotBlank String content, Long productId) {
    }
}
