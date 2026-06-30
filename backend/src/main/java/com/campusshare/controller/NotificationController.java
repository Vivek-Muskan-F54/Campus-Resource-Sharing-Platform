package com.campusshare.controller;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Notification;
import com.campusshare.domain.User;
import com.campusshare.dto.ContentDtos.NotificationResponse;
import com.campusshare.dto.ContentDtos.UnreadCountResponse;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repo;
    private final UserRepository users;

    /** Get a paginated list of all notifications for the current user. */
    @GetMapping
    public Page<NotificationResponse> all(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Long userId = resolveUserId(authentication);
        if (userId == null) {
            return Page.empty(pageable);
        }
        return repo.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    /** Get the count of unread notifications for the current user. */
    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(Authentication authentication) {
        Long userId = resolveUserId(authentication);
        if (userId == null) {
            return new UnreadCountResponse(0L);
        }
        return new UnreadCountResponse(repo.countByRecipientIdAndReadFlagFalse(userId));
    }

    /**
     * Mark a single notification as read.
     * The notification must belong to the authenticated user.
     */
    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(
            Authentication authentication,
            @PathVariable Long id) {

        Long userId = resolveUserId(authentication);
        Notification notification = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new BadRequestException("You do not own this notification");
        }

        notification.setReadFlag(true);
        return toResponse(repo.save(notification));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getMessage(),
                n.getLink(),
                n.isReadFlag(),
                n.getCreatedAt()
        );
    }

    private Long resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }

        String email = authentication.getName().trim().toLowerCase(Locale.ROOT);
        return users.findByEmailIgnoreCase(email)
                .map(User::getId)
                .orElse(null);
    }
}
