package com.campusshare.service.impl;

import com.campusshare.domain.User;
import com.campusshare.domain.UserReputation;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.dto.ReputationDtos.LeaderboardResponse;
import com.campusshare.dto.ReputationDtos.ReputationResponse;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.UserLeaderboardView;
import com.campusshare.repository.UserReputationRepository;
import com.campusshare.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class ReputationServiceImplTest {

    @Mock private UserRepository users;
    @Mock private UserReputationRepository reputations;
    @Mock private NoteRepository notes;
    @Mock private OrderRepository orders;

    @InjectMocks private ReputationServiceImpl reputationService;

    @Test
    @DisplayName("score calculation updates level and badge")
    void recordNoteUploaded_promotesToSilverContributor() {
        User user = user(11L, "Student One");
        UserReputation reputation = reputation(user, 95L);

        when(reputations.findByUserIdForUpdate(11L)).thenReturn(Optional.of(reputation));
        when(reputations.save(any(UserReputation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reputationService.recordNoteUploaded(user);

        assertThat(reputation.getScore()).isEqualTo(105L);
        assertThat(reputation.getLevel()).isEqualTo("Silver Contributor");
        assertThat(reputation.getBadge()).isEqualTo("Silver Contributor");
    }

    @Test
    @DisplayName("badge assignment advances at higher thresholds")
    void recordVerifiedAccount_promotesToGoldContributor() {
        User user = user(12L, "Student Two");
        UserReputation reputation = reputation(user, 290L);

        when(reputations.findByUserIdForUpdate(12L)).thenReturn(Optional.of(reputation));
        when(reputations.save(any(UserReputation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        reputationService.recordVerifiedAccount(user);

        assertThat(reputation.getScore()).isEqualTo(315L);
        assertThat(reputation.getLevel()).isEqualTo("Gold Contributor");
        assertThat(reputation.getBadge()).isEqualTo("Gold Contributor");
    }

    @Test
    @DisplayName("leaderboard ranks contributors, uploaders, and sellers")
    void leaderboard_ranksSections() {
        User user1 = user(1L, "Alpha");
        User user2 = user(2L, "Beta");
        User user3 = user(3L, "Gamma");

        UserReputation rep1 = reputation(user1, 420L);
        UserReputation rep2 = reputation(user2, 250L);
        UserReputation rep3 = reputation(user3, 180L);
        Map<Long, UserReputation> reputationMap = new HashMap<>();
        reputationMap.put(1L, rep1);
        reputationMap.put(2L, rep2);
        reputationMap.put(3L, rep3);

        when(reputations.findAllByOrderByScoreDesc(PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(rep1, rep2, rep3)));
        when(reputations.findByUser_Id(anyLong())).thenAnswer(invocation -> Optional.ofNullable(reputationMap.get(invocation.getArgument(0))));
        when(notes.findTopNoteUploaders(PageRequest.of(0, 10)))
                .thenReturn(List.of(metric(2L, "Beta", 8L), metric(3L, "Gamma", 5L)));
        when(orders.findTopSellers(eq(OrderStatus.COMPLETED), eq(PageRequest.of(0, 10))))
                .thenReturn(List.of(metric(3L, "Gamma", 4L), metric(1L, "Alpha", 2L)));

        LeaderboardResponse response = reputationService.leaderboard();

        assertThat(response.topContributors()).extracting("userId").containsExactly(1L, 2L, 3L);
        assertThat(response.topNoteUploaders()).extracting("userId").containsExactly(2L, 3L);
        assertThat(response.topNoteUploaders()).extracting("metric").containsExactly(8L, 5L);
        assertThat(response.topSellers()).extracting("userId").containsExactly(3L, 1L);
        assertThat(response.topSellers()).extracting("metric").containsExactly(4L, 2L);
    }

    @Test
    @DisplayName("profile retrieval returns a safe empty profile for new users")
    void getByUserId_returnsEmptyProfileForNewUser() {
        User user = user(99L, "New User");

        when(users.findById(99L)).thenReturn(Optional.of(user));
        when(reputations.findByUser_Id(99L)).thenReturn(Optional.empty());
        when(reputations.save(any(UserReputation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReputationResponse response = reputationService.getByUserId(99L);

        assertThat(response.userId()).isEqualTo(99L);
        assertThat(response.score()).isZero();
        assertThat(response.level()).isEqualTo("Bronze Contributor");
        assertThat(response.badge()).isEqualTo("Bronze Contributor");
        assertThat(response.progress().nextThreshold()).isEqualTo(101L);
        assertThat(response.progress().percent()).isZero();
    }

    private static User user(Long id, String name) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        user.setEmail(name.toLowerCase().replace(' ', '.') + "@campus.edu");
        user.setPassword("password");
        user.setCollegeRollNumber("CS-" + id);
        return user;
    }

    private static UserReputation reputation(User user, long score) {
        UserReputation reputation = new UserReputation();
        reputation.setId(user.getId());
        reputation.setUser(user);
        reputation.setScore(score);
        reputation.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        reputation.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        if (score >= 700) {
            reputation.setLevel("Campus Champion");
            reputation.setBadge("Campus Champion");
        } else if (score >= 301) {
            reputation.setLevel("Gold Contributor");
            reputation.setBadge("Gold Contributor");
        } else if (score >= 101) {
            reputation.setLevel("Silver Contributor");
            reputation.setBadge("Silver Contributor");
        } else {
            reputation.setLevel("Bronze Contributor");
            reputation.setBadge("Bronze Contributor");
        }
        return reputation;
    }

    private static UserLeaderboardView metric(Long userId, String userName, Long metric) {
        return new UserLeaderboardView() {
            @Override
            public Long getUserId() {
                return userId;
            }

            @Override
            public String getUserName() {
                return userName;
            }

            @Override
            public Long getMetric() {
                return metric;
            }
        };
    }
}
