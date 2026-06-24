package com.campusshare.service.impl;

import com.campusshare.domain.Category;
import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import com.campusshare.domain.Product;
import com.campusshare.domain.ProductImage;
import com.campusshare.domain.User;
import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import com.campusshare.repository.ActivityEntityCountView;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.ProductRepository;
import com.campusshare.repository.UserActivityRepository;
import com.campusshare.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class RecommendationServiceImplTest {

    private static final String EMAIL = "student@campus.edu";

    @Mock private UserRepository users;
    @Mock private UserActivityRepository activities;
    @Mock private NoteRepository notes;
    @Mock private ProductRepository products;
    @Mock private OrderRepository orders;

    @InjectMocks private RecommendationServiceImpl recommendationService;

    @Test
    @DisplayName("recommended notes are ranked by weighted activity scores")
    void recommendedNotes_ranksByWeightedScores() {
        User user = user(11L);
        Note noteA = note(101L, user(21L), "CSE", "DBMS", Instant.parse("2026-01-02T00:00:00Z"));
        Note noteB = note(102L, user(22L), "ECE", "Signals", Instant.parse("2026-01-03T00:00:00Z"));

        stubUser(user);
        stubNoteCounts(Map.of(
                ActivityType.DOWNLOAD_NOTE, List.of(count(101L, 1L)),
                ActivityType.BOOKMARK_NOTE, List.of(count(101L, 1L), count(102L, 1L)),
                ActivityType.RATE_NOTE, List.of(count(101L, 1L)),
                ActivityType.VIEW_NOTE, List.of(count(101L, 1L), count(102L, 1L))
        ));
        when(notes.findAllById(anyCollection())).thenAnswer(invocation -> {
            Collection<Long> ids = invocation.getArgument(0);
            return List.of(noteA, noteB).stream().filter(note -> ids.contains(note.getId())).toList();
        });
        when(notes.findRecommendedCandidates(anyCollection(), anyCollection(), anyBoolean(), anyBoolean(), eq(ModerationStatus.APPROVED), any()))
                .thenReturn(new PageImpl<>(List.of(noteA, noteB)));

        Page<RecommendedNoteResponse> page = recommendationService.recommendedNotes(EMAIL, PageRequest.of(0, 10));

        assertThat(page).hasSize(2);
        assertThat(page.getContent().get(0).note().id()).isEqualTo(101L);
        assertThat(page.getContent().get(0).score()).isEqualTo(26L);
        assertThat(page.getContent().get(1).note().id()).isEqualTo(102L);
        assertThat(page.getContent().get(1).score()).isEqualTo(10L);
    }

    @Test
    @DisplayName("recommended notes exclude uploaded and already downloaded notes")
    void recommendedNotes_excludesOwnedAndDownloadedNotes() {
        User user = user(11L);
        Note uploaded = note(201L, user, "CSE", "DBMS", Instant.parse("2026-01-02T00:00:00Z"));
        Note downloaded = note(202L, user(22L), "ECE", "Signals", Instant.parse("2026-01-03T00:00:00Z"));
        Note recommended = note(203L, user(23L), "ME", "Thermodynamics", Instant.parse("2026-01-04T00:00:00Z"));

        stubUser(user);
        stubNoteCounts(Map.of(
                ActivityType.DOWNLOAD_NOTE, List.of(count(201L, 1L), count(202L, 1L)),
                ActivityType.VIEW_NOTE, List.of(count(203L, 1L))
        ));
        when(activities.findDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.UPLOAD_NOTE, ActivityEntityType.NOTE))
                .thenReturn(List.of(201L));
        when(activities.findDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(11L, ActivityType.DOWNLOAD_NOTE, ActivityEntityType.NOTE))
                .thenReturn(List.of(202L));
        when(notes.findAllById(anyCollection())).thenAnswer(invocation -> List.of(uploaded, downloaded, recommended));
        when(notes.findRecommendedCandidates(anyCollection(), anyCollection(), anyBoolean(), anyBoolean(), eq(ModerationStatus.APPROVED), any()))
                .thenReturn(new PageImpl<>(List.of(uploaded, downloaded, recommended)));

        Page<RecommendedNoteResponse> page = recommendationService.recommendedNotes(EMAIL, PageRequest.of(0, 10));

        assertThat(page).hasSize(1);
        assertThat(page.getContent().getFirst().note().id()).isEqualTo(203L);
    }

    @Test
    @DisplayName("recommended products are ranked by category engagement")
    void recommendedProducts_ranksByCategoryEngagement() {
        User user = user(11L);
        Category books = category(1L, "Books");
        Category electronics = category(2L, "Electronics");
        Product engagedBooks = product(301L, user(21L), books, "Book A", Instant.parse("2026-01-02T00:00:00Z"));
        Product engagedElectronics = product(302L, user(22L), electronics, "Calculator", Instant.parse("2026-01-03T00:00:00Z"));
        Product recBooks = product(303L, user(23L), books, "Book B", Instant.parse("2026-01-04T00:00:00Z"));
        Product recElectronics = product(304L, user(24L), electronics, "Mic", Instant.parse("2026-01-05T00:00:00Z"));

        stubUser(user);
        stubProductCounts(Map.of(
                ActivityType.ORDER_PRODUCT, List.of(count(301L, 1L)),
                ActivityType.WISHLIST_PRODUCT, List.of(count(301L, 1L)),
                ActivityType.VIEW_PRODUCT, List.of(count(301L, 1L), count(302L, 1L))
        ));
        when(products.findAllById(anyCollection())).thenAnswer(invocation -> {
            Collection<Long> ids = invocation.getArgument(0);
            return List.of(engagedBooks, engagedElectronics).stream().filter(product -> ids.contains(product.getId())).toList();
        });
        when(products.findIdsBySellerId(11L)).thenReturn(List.of());
        when(orders.findDistinctProductIdsByBuyerIdAndStatus(11L, com.campusshare.domain.Enums.OrderStatus.COMPLETED))
                .thenReturn(List.of());
        when(products.findRecommendedCandidates(anyCollection(), anyBoolean(), eq(ListingStatus.ACTIVE), any()))
                .thenReturn(new PageImpl<>(List.of(recBooks, recElectronics)));

        Page<RecommendedProductResponse> page = recommendationService.recommendedProducts(EMAIL, PageRequest.of(0, 10));

        assertThat(page).hasSize(2);
        assertThat(page.getContent().get(0).product().id()).isEqualTo(303L);
        assertThat(page.getContent().get(0).score()).isEqualTo(10L);
        assertThat(page.getContent().get(1).product().id()).isEqualTo(304L);
        assertThat(page.getContent().get(1).score()).isEqualTo(1L);
    }

    @Test
    @DisplayName("recommended products exclude owned and purchased products")
    void recommendedProducts_excludesOwnedAndPurchased() {
        User user = user(11L);
        Category books = category(1L, "Books");
        Product owned = product(401L, user, books, "Owned", Instant.parse("2026-01-02T00:00:00Z"));
        Product purchased = product(402L, user(22L), books, "Purchased", Instant.parse("2026-01-03T00:00:00Z"));
        Product recommended = product(403L, user(23L), books, "Recommended", Instant.parse("2026-01-04T00:00:00Z"));

        stubUser(user);
        stubProductCounts(Map.of(
                ActivityType.VIEW_PRODUCT, List.of(count(403L, 1L))
        ));
        when(products.findAllById(anyCollection())).thenAnswer(invocation -> List.of(owned, purchased, recommended));
        when(products.findIdsBySellerId(11L)).thenReturn(List.of(401L));
        when(orders.findDistinctProductIdsByBuyerIdAndStatus(11L, com.campusshare.domain.Enums.OrderStatus.COMPLETED))
                .thenReturn(List.of(402L));
        when(products.findRecommendedCandidates(anyCollection(), anyBoolean(), eq(ListingStatus.ACTIVE), any()))
                .thenReturn(new PageImpl<>(List.of(owned, purchased, recommended)));

        Page<RecommendedProductResponse> page = recommendationService.recommendedProducts(EMAIL, PageRequest.of(0, 10));

        assertThat(page).hasSize(1);
        assertThat(page.getContent().getFirst().product().id()).isEqualTo(403L);
    }

    private void stubUser(User user) {
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    private void stubNoteCounts(Map<ActivityType, List<ActivityEntityCountView>> counts) {
        when(activities.countByUserIdAndActivityTypeAndEntityType(eq(11L), any(), eq(ActivityEntityType.NOTE)))
                .thenAnswer(invocation -> counts.getOrDefault(invocation.getArgument(1), List.of()));
    }

    private void stubProductCounts(Map<ActivityType, List<ActivityEntityCountView>> counts) {
        when(activities.countByUserIdAndActivityTypeAndEntityType(eq(11L), any(), eq(ActivityEntityType.PRODUCT)))
                .thenAnswer(invocation -> counts.getOrDefault(invocation.getArgument(1), List.of()));
    }

    private static ActivityEntityCountView count(Long entityId, Long count) {
        return new ActivityEntityCountView() {
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

    private static User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setName("User " + id);
        user.setEmail("user" + id + "@campus.edu");
        user.setPassword("password");
        user.setCollegeRollNumber("CS/" + id);
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

    private static Product product(Long id, User seller, Category category, String title, Instant createdAt) {
        Product product = new Product();
        product.setId(id);
        product.setSeller(seller);
        product.setCategory(category);
        product.setTitle(title);
        product.setDescription("Product " + id);
        product.setPrice(new BigDecimal("99.99"));
        product.setType(ListingType.SELL);
        product.setCondition(com.campusshare.domain.Enums.ItemCondition.GOOD);
        product.setStatus(ListingStatus.ACTIVE);
        product.setCreatedAt(createdAt);
        product.setUpdatedAt(createdAt);
        ProductImage image = new ProductImage();
        image.setImageUrl("https://cdn.example.com/product-" + id + ".png");
        image.setSortOrder(0);
        image.setProduct(product);
        product.replaceImages(List.of(image));
        return product;
    }

    private static Category category(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }
}
