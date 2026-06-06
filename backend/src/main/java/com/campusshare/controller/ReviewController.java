package com.campusshare.controller;

import com.campusshare.dto.MarketplaceDtos.ReviewRequest;
import com.campusshare.dto.MarketplaceDtos.ReviewResponse;
import com.campusshare.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /** Get all reviews for a given user (the reviewee). */
    @GetMapping("/user/{userId}")
    public Page<ReviewResponse> getForUser(
            @PathVariable Long userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return reviewService.getReviewsForUser(userId, pageable);
    }

    /** Create a review for a completed order. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(
            Authentication authentication,
            @Valid @RequestBody ReviewRequest request) {
        return reviewService.create(authentication.getName(), request);
    }
}
