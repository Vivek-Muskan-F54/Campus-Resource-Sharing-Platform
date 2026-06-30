package com.campusshare.service.impl;

import com.campusshare.domain.Note;
import com.campusshare.domain.Notification;
import com.campusshare.domain.User;
import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.dto.ContentDtos.NotificationResponse;
import com.campusshare.dto.DashboardDtos.PersonalizedDashboardResponse;
import com.campusshare.dto.DashboardDtos.TrendingNoteResponse;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.ProductDtos.ProductResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.UserActivityRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.RecommendationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class DashboardAggregationServiceImplTest {

    private static final String EMAIL = "student@campus.edu";

    @Mock private UserRepository users;
    @Mock private RecommendationService recommendationService;
    @Mock private UserActivityRepository activities;
    @Mock private NoteRepository notes;
    @Mock private NotificationRepository notifications;

    @InjectMocks private DashboardAggregationServiceImpl dashboardService;

    @Test
    @DisplayName("trending notes are ranked by weighted activity score")
    void personalized_trendingNotesUseWeightedActivityScores() {
        User user = user(11L);
        Note top = note(101L, user(21L), "CSE", "DBMS", Instant.parse("2026-01-04T00:00:00Z"));
        Note runnerUp = note(102L, user(22L), "ECE", "Signals", Instant.parse("2026-01-05T00:00:00Z"));

        stubCommon(user);
        stubRecommendations();
        stubRecentNotes();
        stubNotifications();

        when(activities.countByActivityTypeAndEntityType(ActivityType.DOWNLOAD_NOTE, ActivityEntityType.NOTE))
                .thenReturn(List.of(count(101L, 1L)));
        when(activities.countByActivityTypeAndEntityType(ActivityType.BOOKMARK_NOTE, ActivityEntityType.NOTE))
                .thenReturn(List.of(count(101L, 1L), count(102L, 1L)));
        when(activities.countByActivityTypeAndEntityType(ActivityType.VIEW_NOTE, ActivityEntityType.NOTE))
                .thenReturn(List.of(count(102L, 4L)));
        when(notes.findAllWithUploaderByIdInAndStatus(anyCollection(), eq(ModerationStatus.APPROVED)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    List<Long> ids = (List<Long>) invocation.getArgument(0);
                    return List.of(top, runnerUp).stream().filter(note -> ids.contains(note.getId())).toList();
                });

        PersonalizedDashboardResponse response = dashboardService.personalized(EMAIL, PageRequest.of(0, 6));

        List<TrendingNoteResponse> trending = response.trendingNotes().content();
        assertThat(trending).hasSize(2);
        assertThat(trending.get(0).note().id()).isEqualTo(101L);
        assertThat(trending.get(0).score()).isEqualTo(8L);
        assertThat(trending.get(1).note().id()).isEqualTo(102L);
        assertThat(trending.get(1).score()).isEqualTo(7L);
    }

    @Test
    @DisplayName("recent downloads are returned in most-recent-first order")
    void personalized_recentDownloadsAreOrderedByRecency() {
        User user = user(11L);
        Note recent = note(201L, user(21L), "CSE", "DBMS", Instant.parse("2026-01-05T00:00:00Z"));
        Note older = note(202L, user(22L), "ECE", "Signals", Instant.parse("2026-01-04T00:00:00Z"));

        stubCommon(user);
        stubRecommendations();
        stubNotifications();
        stubTrendingEmpty();

        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.DOWNLOAD_NOTE, ActivityEntityType.NOTE, PageRequest.of(0, 6)))
                .thenReturn(new PageImpl<>(List.of(201L, 202L), PageRequest.of(0, 6), 2));
        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.BOOKMARK_NOTE, ActivityEntityType.NOTE, PageRequest.of(0, 6)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 6), 0));
        when(notes.findAllWithUploaderByIdInAndStatus(anyCollection(), eq(ModerationStatus.APPROVED)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    List<Long> ids = (List<Long>) invocation.getArgument(0);
                    return List.of(recent, older).stream().filter(note -> ids.contains(note.getId())).toList();
                });

        PersonalizedDashboardResponse response = dashboardService.personalized(EMAIL, PageRequest.of(0, 6));

        assertThat(response.recentDownloads().content()).extracting(NoteResponse::id).containsExactly(201L, 202L);
    }

    @Test
    @DisplayName("dashboard aggregation returns all sections")
    void personalized_aggregatesDashboardSections() {
        User user = user(11L);
        Note recommendedNote = note(301L, user(31L), "CSE", "DBMS", Instant.parse("2026-01-06T00:00:00Z"));
        Note recentDownload = note(302L, user(32L), "ECE", "Networks", Instant.parse("2026-01-05T00:00:00Z"));
        Note bookmarked = note(303L, user(33L), "ME", "Thermodynamics", Instant.parse("2026-01-04T00:00:00Z"));
        Notification notification = notification(401L, user, "New notification");

        stubCommon(user);
        when(recommendationService.recommendedNotes(eq(EMAIL), any()))
                .thenReturn(new PageImpl<>(List.of(new RecommendedNoteResponse(12L, "Recommended", noteResponse(recommendedNote)))));
        when(recommendationService.recommendedProducts(eq(EMAIL), any()))
                .thenReturn(new PageImpl<>(List.of(new RecommendedProductResponse(9L, "Recommended", productResponse()))));
        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.DOWNLOAD_NOTE, ActivityEntityType.NOTE, PageRequest.of(0, 6)))
                .thenReturn(new PageImpl<>(List.of(302L), PageRequest.of(0, 6), 1));
        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.BOOKMARK_NOTE, ActivityEntityType.NOTE, PageRequest.of(0, 6)))
                .thenReturn(new PageImpl<>(List.of(303L), PageRequest.of(0, 6), 1));
        when(activities.countByActivityTypeAndEntityType(any(), eq(ActivityEntityType.NOTE)))
                .thenReturn(List.of());
        when(notes.findAllWithUploaderByIdInAndStatus(anyCollection(), eq(ModerationStatus.APPROVED)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    List<Long> ids = (List<Long>) invocation.getArgument(0);
                    return List.of(recommendedNote, recentDownload, bookmarked).stream().filter(note -> ids.contains(note.getId())).toList();
                });
        when(notifications.findByRecipientIdOrderByCreatedAtDesc(11L, PageRequest.of(0, 6)))
                .thenReturn(new PageImpl<>(List.of(notification), PageRequest.of(0, 6), 1));

        PersonalizedDashboardResponse response = dashboardService.personalized(EMAIL, PageRequest.of(0, 6));

        assertThat(response.recommendedNotes().content()).hasSize(1);
        assertThat(response.recommendedProducts().content()).hasSize(1);
        assertThat(response.recentDownloads().content()).extracting(NoteResponse::id).containsExactly(302L);
        assertThat(response.bookmarkedNotes().content()).extracting(NoteResponse::id).containsExactly(303L);
        assertThat(response.recentNotifications().content()).extracting(NotificationResponse::id).containsExactly(401L);
        assertThat(response.generatedAt()).isNotNull();
    }

    @Test
    @DisplayName("empty activity returns an empty personalized dashboard without failing")
    void personalized_emptyActivityReturnsEmptyDashboard() {
        User user = user(11L);

        stubCommon(user);
        stubRecommendations();
        stubRecentNotes();
        stubNotifications();
        stubTrendingEmpty();

        PersonalizedDashboardResponse response = dashboardService.personalized(EMAIL, PageRequest.of(0, 4));

        assertThat(response.recommendedNotes().content()).isEmpty();
        assertThat(response.recommendedProducts().content()).isEmpty();
        assertThat(response.recentDownloads().content()).isEmpty();
        assertThat(response.bookmarkedNotes().content()).isEmpty();
        assertThat(response.trendingNotes().content()).isEmpty();
        assertThat(response.recentNotifications().content()).isEmpty();
    }

    private void stubCommon(User user) {
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
    }

    private void stubRecommendations() {
        when(recommendationService.recommendedNotes(eq(EMAIL), any()))
                .thenReturn(Page.empty(PageRequest.of(0, 6)));
        when(recommendationService.recommendedProducts(eq(EMAIL), any()))
                .thenReturn(Page.empty(PageRequest.of(0, 6)));
    }

    private void stubRecentNotes() {
        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(eq(11L), eq(ActivityType.DOWNLOAD_NOTE), eq(ActivityEntityType.NOTE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 6), 0));
        when(activities.findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(eq(11L), eq(ActivityType.BOOKMARK_NOTE), eq(ActivityEntityType.NOTE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 6), 0));
    }

    private void stubNotifications() {
        when(notifications.findByRecipientIdOrderByCreatedAtDesc(eq(11L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 6), 0));
    }

    private void stubTrendingEmpty() {
        when(activities.countByActivityTypeAndEntityType(any(), eq(ActivityEntityType.NOTE)))
                .thenReturn(List.of());
    }

    private static User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setName("User " + id);
        user.setEmail("user" + id + "@campus.edu");
        user.setPassword("password");
        return user;
    }

    private static Note note(Long id, User uploader, String branch, String subject, Instant createdAt) {
        Note note = new Note();
        note.setId(id);
        note.setUploader(uploader);
        note.setTitle("Note " + id);
        note.setBranch(branch);
        note.setSemester(5);
        note.setSubject(subject);
        note.setFileUrl("https://cdn.example.com/note-" + id + ".pdf");
        note.setStatus(ModerationStatus.APPROVED);
        note.setCreatedAt(createdAt);
        note.setUpdatedAt(createdAt);
        return note;
    }

    private static NoteResponse noteResponse(Note note) {
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

    private static ProductResponse productResponse() {
        return new ProductResponse(
                901L,
                "Product 901",
                "Description",
                new java.math.BigDecimal("99.99"),
                com.campusshare.domain.Enums.ListingType.SELL,
                com.campusshare.domain.Enums.ItemCondition.GOOD,
                com.campusshare.domain.Enums.ListingStatus.ACTIVE,
                1L,
                "Books",
                21L,
                "Seller",
                List.of(),
                List.of(),
                Instant.parse("2026-01-06T00:00:00Z"),
                Instant.parse("2026-01-06T00:00:00Z")
        );
    }

    private static Notification notification(Long id, User recipient, String message) {
        Notification notification = new Notification();
        notification.setId(id);
        notification.setRecipient(recipient);
        notification.setType(NotificationType.SYSTEM);
        notification.setMessage(message);
        notification.setLink("/dashboard");
        notification.setReadFlag(false);
        notification.setCreatedAt(Instant.parse("2026-01-06T00:00:00Z"));
        notification.setUpdatedAt(Instant.parse("2026-01-06T00:00:00Z"));
        return notification;
    }

    private static com.campusshare.repository.ActivityEntityCountView count(Long entityId, Long count) {
        return new com.campusshare.repository.ActivityEntityCountView() {
            @Override
            public Long getEntityId() {
                return entityId;
            }

            @Override
            public Long getActivityCount() {
                return count;
            }
        };
    }
}
