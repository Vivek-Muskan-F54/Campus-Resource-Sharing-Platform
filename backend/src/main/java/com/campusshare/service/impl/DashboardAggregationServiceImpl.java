package com.campusshare.service.impl;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import com.campusshare.domain.User;
import com.campusshare.dto.ContentDtos.NotificationResponse;
import com.campusshare.dto.DashboardDtos.PageResponse;
import com.campusshare.dto.DashboardDtos.PersonalizedDashboardResponse;
import com.campusshare.dto.DashboardDtos.TrendingNoteResponse;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import com.campusshare.repository.ActivityEntityCountView;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.UserActivityRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.DashboardAggregationService;
import com.campusshare.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class DashboardAggregationServiceImpl implements DashboardAggregationService {

    private static final Logger log = LoggerFactory.getLogger(DashboardAggregationServiceImpl.class);

    private static final Map<ActivityType, Integer> TRENDING_WEIGHTS = Map.of(
            ActivityType.DOWNLOAD_NOTE, 5,
            ActivityType.BOOKMARK_NOTE, 3,
            ActivityType.VIEW_NOTE, 1
    );

    private final UserRepository users;
    private final RecommendationService recommendationService;
    private final UserActivityRepository activities;
    private final NoteRepository notes;
    private final NotificationRepository notifications;

    @Override
    @Transactional(readOnly = true)
    public PersonalizedDashboardResponse personalized(String email, Pageable pageable) {
        User user = findUser(email);
        if (user == null) {
            return emptyDashboard(pageable);
        }

        Page<RecommendedNoteResponse> recommendedNotes = safeSection(
                "recommended_notes",
                () -> recommendationService.recommendedNotes(email, pageable),
                pageable);
        Page<RecommendedProductResponse> recommendedProducts = safeSection(
                "recommended_products",
                () -> recommendationService.recommendedProducts(email, pageable),
                pageable);
        Page<NoteResponse> recentDownloads = safeSection(
                "recent_downloads",
                () -> recentNotes(user.getId(), ActivityType.DOWNLOAD_NOTE, pageable),
                pageable);
        Page<NoteResponse> bookmarkedNotes = safeSection(
                "bookmarked_notes",
                () -> recentNotes(user.getId(), ActivityType.BOOKMARK_NOTE, pageable),
                pageable);
        Page<TrendingNoteResponse> trendingNotes = safeSection(
                "trending_notes",
                () -> trendingNotes(pageable),
                pageable);
        Page<NotificationResponse> recentNotifications = safeSection(
                "recent_notifications",
                () -> notifications.findByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable)
                        .map(this::toNotificationResponse),
                pageable);

        log.info(
                "event=dashboard_personalized user_id={} recommended_notes={} recommended_products={} recent_downloads={} bookmarked_notes={} trending_notes={} recent_notifications={}",
                user.getId(),
                recommendedNotes.getNumberOfElements(),
                recommendedProducts.getNumberOfElements(),
                recentDownloads.getNumberOfElements(),
                bookmarkedNotes.getNumberOfElements(),
                trendingNotes.getNumberOfElements(),
                recentNotifications.getNumberOfElements()
        );

        return new PersonalizedDashboardResponse(
                toPageResponse(recommendedNotes),
                toPageResponse(recommendedProducts),
                toPageResponse(recentDownloads),
                toPageResponse(bookmarkedNotes),
                toPageResponse(trendingNotes),
                toPageResponse(recentNotifications),
                Instant.now()
        );
    }

    private PersonalizedDashboardResponse emptyDashboard(Pageable pageable) {
        return new PersonalizedDashboardResponse(
                toPageResponse(Page.empty(pageable)),
                toPageResponse(Page.empty(pageable)),
                toPageResponse(Page.empty(pageable)),
                toPageResponse(Page.empty(pageable)),
                toPageResponse(Page.empty(pageable)),
                toPageResponse(Page.empty(pageable)),
                Instant.now()
        );
    }

    private Page<NoteResponse> recentNotes(Long userId, ActivityType activityType, Pageable pageable) {
        Page<Long> noteIds = activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(
                userId,
                activityType,
                ActivityEntityType.NOTE,
                pageable);

        if (noteIds.isEmpty()) {
            return Page.empty(pageable);
        }

        Map<Long, Note> notesById = notes.findAllWithUploaderByIdInAndStatus(
                        noteIds.getContent(),
                        ModerationStatus.APPROVED)
                .stream()
                .collect(LinkedHashMap::new, (map, note) -> map.put(note.getId(), note), Map::putAll);

        List<NoteResponse> content = noteIds.getContent().stream()
                .map(notesById::get)
                .filter(Objects::nonNull)
                .map(this::toNoteResponse)
                .toList();

        return new PageImpl<>(content, pageable, noteIds.getTotalElements());
    }

    private Page<TrendingNoteResponse> trendingNotes(Pageable pageable) {
        Map<Long, Integer> scores = new HashMap<>();
        for (Map.Entry<ActivityType, Integer> entry : TRENDING_WEIGHTS.entrySet()) {
            List<ActivityEntityCountView> counts = activities.countByActivityTypeAndEntityType(
                    entry.getKey(),
                    ActivityEntityType.NOTE);
            for (ActivityEntityCountView count : counts) {
                if (count.getEntityId() == null || count.getActivityCount() == null) {
                    continue;
                }
                int weighted = Math.toIntExact(count.getActivityCount() * entry.getValue());
                scores.merge(count.getEntityId(), weighted, Integer::sum);
            }
        }

        if (scores.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Long> trendingIds = scores.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .map(Map.Entry::getKey)
                .toList();

        Map<Long, Note> notesById = notes.findAllWithUploaderByIdInAndStatus(trendingIds, ModerationStatus.APPROVED)
                .stream()
                .collect(LinkedHashMap::new, (map, note) -> map.put(note.getId(), note), Map::putAll);

        List<TrendingNoteResponse> content = trendingIds.stream()
                .map(notesById::get)
                .filter(Objects::nonNull)
                .map(note -> new TrendingNoteResponse(
                        scores.get(note.getId()).longValue(),
                        "Trending across campus activity",
                        toNoteResponse(note)))
                .sorted(Comparator.comparingLong(TrendingNoteResponse::score).reversed())
                .toList();

        return slice(content, pageable);
    }

    private NotificationResponse toNotificationResponse(com.campusshare.domain.Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getLink(),
                notification.isReadFlag(),
                notification.getCreatedAt()
        );
    }

    private NoteResponse toNoteResponse(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getBranch(),
                note.getSemester(),
                note.getSubject(),
                note.getFileUrl(),
                note.getOriginalFilename(),
                note.getFileSize(),
                note.getStatus(),
                note.getDownloadCount(),
                note.getUploader().getId(),
                note.getUploader().getName(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }

    private <T> PageResponse<T> toPageResponse(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    private <T> Page<T> slice(List<T> content, Pageable pageable) {
        int start = Math.min((int) pageable.getOffset(), content.size());
        int end = Math.min(start + pageable.getPageSize(), content.size());
        return new PageImpl<>(content.subList(start, end), pageable, content.size());
    }

    private User findUser(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return users.findByEmailIgnoreCase(normalizeEmail(email))
                .orElse(null);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private <T> Page<T> safeSection(String section, Supplier<Page<T>> loader, Pageable pageable) {
        try {
            Page<T> page = loader.get();
            return page == null ? Page.empty(pageable) : page;
        } catch (RuntimeException exception) {
            log.warn("dashboard section failed section={} reason={}", section, exception.getMessage());
            return Page.empty(pageable);
        }
    }

    @FunctionalInterface
    private interface Supplier<T> {
        T get();
    }
}
