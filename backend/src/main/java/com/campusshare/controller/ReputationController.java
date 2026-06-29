package com.campusshare.controller;

import com.campusshare.dto.ReputationDtos.LeaderboardResponse;
import com.campusshare.dto.ReputationDtos.ReputationResponse;
import com.campusshare.service.ReputationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reputation")
@RequiredArgsConstructor
public class ReputationController {

    private final ReputationService reputationService;

    @GetMapping("/me")
    public ReputationResponse me(Authentication authentication) {
        return reputationService.me(authentication.getName());
    }

    @GetMapping("/leaderboard")
    public LeaderboardResponse leaderboard() {
        return reputationService.leaderboard();
    }

    @GetMapping("/{userId}")
    public ReputationResponse getByUserId(@PathVariable Long userId) {
        return reputationService.getByUserId(userId);
    }
}
