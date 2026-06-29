package com.campusshare.service.impl;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.User;
import com.campusshare.domain.UserReputation;
import com.campusshare.dto.ReputationDtos.LeaderboardEntryResponse;
import com.campusshare.dto.ReputationDtos.LeaderboardResponse;
import com.campusshare.dto.ReputationDtos.ReputationProgressResponse;
import com.campusshare.dto.ReputationDtos.ReputationResponse;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.UserLeaderboardView;
import com.campusshare.repository.UserReputationRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.service.ReputationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.LongConsumer;

@Service
@RequiredArgsConstructor
@Transactional
public class ReputationServiceImpl implements ReputationService {

    private static final Logger log = LoggerFactory.getLogger(ReputationServiceImpl.class);
    private static final int LEADERBOARD_SIZE = 10;

    private static final Map<Integer, Tier> TIERS = Map.of(
            0, new Tier("Bronze Contributor", "Bronze Contributor", 101L),
            1, new Tier("Silver Contributor", "Silver Contributor", 301L),
            2, new Tier("Gold Contributor", "Gold Contributor", 700L),
            3, new Tier("Campus Champion", "Campus Champion", null)
    );

    private final UserRepository users;
    private final UserReputationRepository reputations;
    private final NoteRepository notes;
    private final OrderRepository orders;

    @Override
    @Transactional
    public ReputationResponse me(String email) {
        User user = findUserByEmail(email);
        return toResponse(ensureReputation(user));
    }

    @Override
    @Transactional
    public ReputationResponse getByUserId(Long userId) {
        return toResponse(ensureReputation(findUserById(userId)));
    }

    @Override
    @Transactional(readOnly = true)
    public LeaderboardResponse leaderboard() {
        List<LeaderboardEntryResponse> topContributors = reputations.findAllByOrderByScoreDesc(PageRequest.of(0, LEADERBOARD_SIZE))
                .map(this::toLeaderboardEntry)
                .getContent();

        List<LeaderboardEntryResponse> topNoteUploaders = notes.findTopNoteUploaders(PageRequest.of(0, LEADERBOARD_SIZE))
                .stream()
                .map(this::toLeaderboardEntry)
                .toList();

        List<LeaderboardEntryResponse> topSellers = orders.findTopSellers(OrderStatus.COMPLETED, PageRequest.of(0, LEADERBOARD_SIZE))
                .stream()
                .map(this::toLeaderboardEntry)
                .toList();

        return new LeaderboardResponse(topContributors, topNoteUploaders, topSellers, Instant.now());
    }

    @Override
    public void recordNoteUploaded(User user) {
        adjustScore(user, 10);
    }

    @Override
    public void recordNoteApproved(User user) {
        adjustScore(user, 20);
    }

    @Override
    public void recordSuccessfulSale(User seller) {
        adjustScore(seller, 15);
    }

    @Override
    public void recordPositiveRating(User user) {
        adjustScore(user, 5);
    }

    @Override
    public void recordVerifiedAccount(User user) {
        adjustScore(user, 25);
    }

    private void adjustScore(User user, int delta) {
        if (user == null || delta == 0) {
            return;
        }

        UserReputation reputation = lockOrCreate(user);
        reputation.setScore(Math.max(0, reputation.getScore() + delta));
        applyTier(reputation);
        reputations.save(reputation);
        log.info("event=reputation_updated user_id={} delta={} score={} level={}",
                user.getId(), delta, reputation.getScore(), reputation.getLevel());
    }

    private UserReputation lockOrCreate(User user) {
        return reputations.findByUserIdForUpdate(user.getId())
                .orElseGet(() -> {
                    try {
                        UserReputation reputation = new UserReputation();
                        reputation.setUser(user);
                        applyTier(reputation);
                        return reputations.saveAndFlush(reputation);
                    } catch (DataIntegrityViolationException conflict) {
                        return reputations.findByUserIdForUpdate(user.getId())
                                .orElseThrow(() -> conflict);
                    }
                });
    }

    private UserReputation ensureReputation(User user) {
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }
        return reputations.findByUser_Id(user.getId())
                .orElseGet(() -> {
                    UserReputation reputation = new UserReputation();
                    reputation.setUser(user);
                    applyTier(reputation);
                    return reputations.save(reputation);
                });
    }

    private void applyTier(UserReputation reputation) {
        Tier tier = tierFor(reputation.getScore());
        reputation.setLevel(tier.level());
        reputation.setBadge(tier.badge());
    }

    private ReputationResponse toResponse(UserReputation reputation) {
        Tier tier = tierFor(reputation.getScore());
        Long nextThreshold = tier.nextThreshold();
        int percent = tier.nextThreshold() == null
                ? 100
                : (int) Math.min(100, Math.round((double) reputation.getScore() * 100 / tier.nextThreshold()));
        ReputationProgressResponse progress = new ReputationProgressResponse(
                reputation.getScore(),
                nextThreshold,
                percent,
                nextThreshold == null ? null : nextTierLabel(reputation.getScore())
        );

        return new ReputationResponse(
                reputation.getUser().getId(),
                reputation.getUser().getName(),
                reputation.getScore(),
                reputation.getLevel(),
                reputation.getBadge(),
                progress,
                reputation.getCreatedAt(),
                reputation.getUpdatedAt()
        );
    }

    private LeaderboardEntryResponse toLeaderboardEntry(UserReputation reputation) {
        return new LeaderboardEntryResponse(
                reputation.getUser().getId(),
                reputation.getUser().getName(),
                reputation.getScore(),
                reputation.getLevel(),
                reputation.getBadge(),
                reputation.getScore()
        );
    }

    private LeaderboardEntryResponse toLeaderboardEntry(UserLeaderboardView view) {
        UserReputation reputation = reputations.findByUser_Id(view.getUserId())
                .orElseGet(() -> {
                    UserReputation snapshot = new UserReputation();
                    snapshot.setUser(findUserById(view.getUserId()));
                    applyTier(snapshot);
                    return snapshot;
                });
        return new LeaderboardEntryResponse(
                reputation.getUser().getId(),
                view.getUserName(),
                reputation.getScore(),
                reputation.getLevel(),
                reputation.getBadge(),
                view.getMetric() == null ? 0L : view.getMetric()
        );
    }

    private Tier tierFor(long score) {
        if (score >= 700) {
            return TIERS.get(3);
        }
        if (score >= 301) {
            return TIERS.get(2);
        }
        if (score >= 101) {
            return TIERS.get(1);
        }
        return TIERS.get(0);
    }

    private String nextTierLabel(long score) {
        if (score < 101) return "Silver Contributor";
        if (score < 301) return "Gold Contributor";
        if (score < 700) return "Campus Champion";
        return null;
    }

    private User findUserByEmail(String email) {
        return users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private User findUserById(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private record Tier(String level, String badge, Long nextThreshold) {
    }
}
