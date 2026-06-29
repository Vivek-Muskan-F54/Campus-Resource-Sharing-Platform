package com.campusshare.service;

import com.campusshare.domain.User;
import com.campusshare.dto.ReputationDtos.LeaderboardResponse;
import com.campusshare.dto.ReputationDtos.ReputationResponse;

public interface ReputationService {
    ReputationResponse me(String email);

    ReputationResponse getByUserId(Long userId);

    LeaderboardResponse leaderboard();

    void recordNoteUploaded(User user);

    void recordNoteApproved(User user);

    void recordSuccessfulSale(User seller);

    void recordPositiveRating(User user);

    void recordVerifiedAccount(User user);
}
