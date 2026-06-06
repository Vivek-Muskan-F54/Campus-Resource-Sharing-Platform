package com.campusshare.service;

import com.campusshare.dto.MarketplaceDtos.ReviewRequest;
import com.campusshare.dto.MarketplaceDtos.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReviewService {

    /**
     * Returns all reviews where the given user is the reviewee.
     */
    Page<ReviewResponse> getReviewsForUser(Long userId, Pageable pageable);

    /**
     * Creates a review for a completed order.
     * The authenticated user identified by {@code reviewerEmail} must be a
     * buyer or seller of the order, and must not have reviewed that order before.
     */
    ReviewResponse create(String reviewerEmail, ReviewRequest request);
}
