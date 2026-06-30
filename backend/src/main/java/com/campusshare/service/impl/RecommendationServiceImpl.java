package com.campusshare.service.impl;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.domain.Note;
import com.campusshare.domain.Product;
import com.campusshare.domain.User;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.ProductDtos.ProductImageResponse;
import com.campusshare.dto.ProductDtos.ProductResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import com.campusshare.repository.ActivityEntityCountView;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.ProductRepository;
import com.campusshare.repository.UserActivityRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RecommendationServiceImpl implements RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationServiceImpl.class);
    private static final int CANDIDATE_POOL_MULTIPLIER = 5;

    private static final Map<ActivityType, Integer> NOTE_WEIGHTS = Map.of(
            ActivityType.DOWNLOAD_NOTE, 5,
            ActivityType.BOOKMARK_NOTE, 4,
            ActivityType.RATE_NOTE, 3,
            ActivityType.VIEW_NOTE, 1
    );

    private static final Map<ActivityType, Integer> PRODUCT_WEIGHTS = Map.of(
            ActivityType.ORDER_PRODUCT, 5,
            ActivityType.WISHLIST_PRODUCT, 4,
            ActivityType.VIEW_PRODUCT, 1
    );

    private final UserRepository users;
    private final UserActivityRepository activities;
    private final NoteRepository notes;
    private final ProductRepository products;
    private final OrderRepository orders;

    @Override
    @Transactional(readOnly = true)
    public Page<RecommendedNoteResponse> recommendedNotes(String email, Pageable pageable) {
        User user = findUser(email);
        Map<Long, Integer> noteSignalScores = collectScores(user.getId(), ActivityEntityType.NOTE, NOTE_WEIGHTS);
        Set<Long> excludedNoteIds = new HashSet<>(collectIds(user.getId(), ActivityType.UPLOAD_NOTE, ActivityEntityType.NOTE));
        excludedNoteIds.addAll(collectIds(user.getId(), ActivityType.DOWNLOAD_NOTE, ActivityEntityType.NOTE));

        Map<String, Integer> branchPreferences = new LinkedHashMap<>();
        Map<String, Integer> subjectPreferences = new LinkedHashMap<>();
        hydrateNotePreferences(noteSignalScores, branchPreferences, subjectPreferences);

        List<String> topBranches = topKeys(branchPreferences, 5);
        List<String> topSubjects = topKeys(subjectPreferences, 5);

        boolean useBranchFilters = !topBranches.isEmpty();
        boolean useSubjectFilters = !topSubjects.isEmpty();
        Pageable poolPageable = PageRequest.of(0, Math.max(pageable.getPageSize() * CANDIDATE_POOL_MULTIPLIER, 40),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Note> candidatePage = notes.findRecommendedCandidates(
                safeStringList(topBranches),
                safeStringList(topSubjects),
                useBranchFilters,
                useSubjectFilters,
                ModerationStatus.APPROVED,
                poolPageable);

        List<ScoredNote> ranked = candidatePage.getContent().stream()
                .filter(note -> note.getUploader() != null)
                .filter(note -> !note.getUploader().getId().equals(user.getId()))
                .filter(note -> !excludedNoteIds.contains(note.getId()))
                .map(note -> scoreNote(note, branchPreferences, subjectPreferences))
                .sorted(Comparator
                        .comparingInt(ScoredNote::score).reversed()
                        .thenComparing(ScoredNote::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Page<RecommendedNoteResponse> page = slice(ranked, pageable).map(this::toRecommendedNote);
        log.info("event=recommendations_notes user_id={} count={}", user.getId(), page.getNumberOfElements());
        return page;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RecommendedProductResponse> recommendedProducts(String email, Pageable pageable) {
        User user = findUser(email);
        Map<Long, Integer> productSignalScores = collectScores(user.getId(), ActivityEntityType.PRODUCT, PRODUCT_WEIGHTS);
        Set<Long> purchasedProductIds = new HashSet<>(
                orders.findDistinctProductIdsByBuyerIdAndStatus(user.getId(), OrderStatus.COMPLETED));
        Set<Long> ownProductIds = new HashSet<>(products.findIdsBySellerId(user.getId()));

        Map<Long, Integer> categoryPreferences = new LinkedHashMap<>();
        hydrateProductPreferences(productSignalScores, categoryPreferences);

        List<Long> topCategoryIds = topLongKeys(categoryPreferences, 5);
        boolean useCategoryFilters = !topCategoryIds.isEmpty();
        Pageable poolPageable = PageRequest.of(0, Math.max(pageable.getPageSize() * CANDIDATE_POOL_MULTIPLIER, 40),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Product> candidatePage = products.findRecommendedCandidates(
                safeLongList(topCategoryIds),
                useCategoryFilters,
                ListingStatus.ACTIVE,
                poolPageable);

        List<ScoredProduct> ranked = candidatePage.getContent().stream()
                .filter(product -> product.getSeller() != null)
                .filter(product -> !product.getSeller().getId().equals(user.getId()))
                .filter(product -> !ownProductIds.contains(product.getId()))
                .filter(product -> !purchasedProductIds.contains(product.getId()))
                .map(product -> scoreProduct(product, categoryPreferences))
                .sorted(Comparator
                        .comparingInt(ScoredProduct::score).reversed()
                        .thenComparing(ScoredProduct::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Page<RecommendedProductResponse> page = slice(ranked, pageable).map(this::toRecommendedProduct);
        log.info("event=recommendations_products user_id={} count={}", user.getId(), page.getNumberOfElements());
        return page;
    }

    private User findUser(String email) {
        return users.findByEmailIgnoreCase(normalize(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Map<Long, Integer> collectScores(Long userId, ActivityEntityType entityType, Map<ActivityType, Integer> weights) {
        Map<Long, Integer> scores = new HashMap<>();
        for (Map.Entry<ActivityType, Integer> entry : weights.entrySet()) {
            List<ActivityEntityCountView> counts = activities.countByUserIdAndActivityTypeAndEntityType(
                    userId, entry.getKey(), entityType);
            for (ActivityEntityCountView count : counts) {
                if (count.getEntityId() == null || count.getActivityCount() == null) continue;
                int next = Math.toIntExact(count.getActivityCount() * entry.getValue());
                scores.merge(count.getEntityId(), next, Integer::sum);
            }
        }
        return scores;
    }

    private Collection<Long> collectIds(Long userId, ActivityType activityType, ActivityEntityType entityType) {
        return activities.findDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(userId, activityType, entityType);
    }

    private void hydrateNotePreferences(
            Map<Long, Integer> noteSignalScores,
            Map<String, Integer> branchPreferences,
            Map<String, Integer> subjectPreferences) {

        if (noteSignalScores.isEmpty()) {
            return;
        }

        for (Note note : notes.findAllById(noteSignalScores.keySet())) {
            Integer score = noteSignalScores.get(note.getId());
            if (score == null) {
                continue;
            }
            mergePreference(branchPreferences, note.getBranch(), score);
            mergePreference(subjectPreferences, note.getSubject(), score);
        }
    }

    private void hydrateProductPreferences(Map<Long, Integer> productSignalScores, Map<Long, Integer> categoryPreferences) {
        if (productSignalScores.isEmpty()) {
            return;
        }

        for (Product product : products.findAllById(productSignalScores.keySet())) {
            Integer score = productSignalScores.get(product.getId());
            if (score == null || product.getCategory() == null) {
                continue;
            }
            categoryPreferences.merge(product.getCategory().getId(), score, Integer::sum);
        }
    }

    private void mergePreference(Map<String, Integer> target, String key, Integer score) {
        if (key == null || score == null) {
            return;
        }
        target.merge(key.trim().toLowerCase(Locale.ROOT), score, Integer::sum);
    }

    private List<String> topKeys(Map<String, Integer> preferences, int limit) {
        return preferences.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private List<Long> topLongKeys(Map<Long, Integer> preferences, int limit) {
        return preferences.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
    }

    private List<String> safeStringList(List<String> items) {
        return items == null || items.isEmpty() ? List.of("__none__") : items;
    }

    private List<Long> safeLongList(List<Long> items) {
        return items == null || items.isEmpty() ? List.of(-1L) : items;
    }

    private ScoredNote scoreNote(Note note, Map<String, Integer> branchPreferences, Map<String, Integer> subjectPreferences) {
        int branchScore = branchPreferences.getOrDefault(normalize(note.getBranch()), 0);
        int subjectScore = subjectPreferences.getOrDefault(normalize(note.getSubject()), 0);
        int total = branchScore + subjectScore;
        String reason = buildNoteReason(branchScore > 0 ? note.getBranch() : null, subjectScore > 0 ? note.getSubject() : null);
        return new ScoredNote(note, total, reason);
    }

    private ScoredProduct scoreProduct(Product product, Map<Long, Integer> categoryPreferences) {
        int score = product.getCategory() == null ? 0 : categoryPreferences.getOrDefault(product.getCategory().getId(), 0);
        String reason = product.getCategory() == null ? "Matched your activity" : "Because you interact with " + product.getCategory().getName();
        return new ScoredProduct(product, score, reason);
    }

    private String buildNoteReason(String branch, String subject) {
        if (branch != null && subject != null) {
            return "Because you often engage with " + branch + " and " + subject;
        }
        if (branch != null) {
            return "Because you often engage with " + branch;
        }
        if (subject != null) {
            return "Because you often engage with " + subject;
        }
        return "Based on your recent note activity";
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

    private ProductResponse toProductResponse(Product product) {
        List<ProductImageResponse> images = product.getImages().stream()
                .map(image -> new ProductImageResponse(
                        image.getId(),
                        image.getImageUrl(),
                        image.getPublicId(),
                        image.getSortOrder()))
                .toList();

        return new ProductResponse(
                product.getId(),
                product.getTitle(),
                product.getDescription(),
                product.getPrice(),
                product.getType(),
                product.getCondition(),
                product.getStatus(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getSeller().getId(),
                product.getSeller().getName(),
                images.stream().map(ProductImageResponse::imageUrl).toList(),
                images,
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    private RecommendedNoteResponse toRecommendedNote(ScoredNote scoredNote) {
        return new RecommendedNoteResponse((long) scoredNote.score(), scoredNote.reason(), toNoteResponse(scoredNote.note()));
    }

    private RecommendedProductResponse toRecommendedProduct(ScoredProduct scoredProduct) {
        return new RecommendedProductResponse((long) scoredProduct.score(), scoredProduct.reason(), toProductResponse(scoredProduct.product()));
    }

    private <T> Page<T> slice(List<T> items, Pageable pageable) {
        int start = Math.min((int) pageable.getOffset(), items.size());
        int end = Math.min(start + pageable.getPageSize(), items.size());
        return new PageImpl<>(items.subList(start, end), pageable, items.size());
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private record ScoredNote(Note note, int score, String reason) {
        private java.time.Instant createdAt() {
            return note.getCreatedAt();
        }
    }

    private record ScoredProduct(Product product, int score, String reason) {
        private java.time.Instant createdAt() {
            return product.getCreatedAt();
        }
    }
}
