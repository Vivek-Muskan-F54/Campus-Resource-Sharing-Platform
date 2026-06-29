package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.domain.Review;
import com.campusshare.domain.User;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.dto.MarketplaceDtos.ReviewRequest;
import com.campusshare.dto.MarketplaceDtos.ReviewResponse;
import com.campusshare.repository.OrderRepository;
import com.campusshare.repository.ReviewRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.ReviewService;
import com.campusshare.service.ReputationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewServiceImpl implements ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewServiceImpl.class);

    private final ReviewRepository reviews;
    private final OrderRepository orders;
    private final UserRepository users;
    private final ReputationService reputationService;

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviewsForUser(Long userId, Pageable pageable) {
        // Verify the user exists before querying
        if (!users.existsById(userId)) {
            throw new ResourceNotFoundException("User not found");
        }
        return reviews.findByRevieweeId(userId, pageable).map(this::toResponse);
    }

    @Override
    public ReviewResponse create(String reviewerEmail, ReviewRequest request) {
        User reviewer = users.findByEmail(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MarketplaceOrder order = orders.findById(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Security: reviewer must be a participant of the order
        boolean isParticipant = order.getBuyer().getId().equals(reviewer.getId())
                || order.getSeller().getId().equals(reviewer.getId());
        if (!isParticipant) {
            throw new BadRequestException("You are not a participant in this order");
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BadRequestException("Order must be completed before leaving a review");
        }

        if (reviews.existsByOrderIdAndReviewerId(order.getId(), reviewer.getId())) {
            throw new BadRequestException("You have already reviewed this order");
        }

        // The reviewee is the other participant
        User reviewee = order.getBuyer().getId().equals(reviewer.getId())
                ? order.getSeller()
                : order.getBuyer();

        Review review = new Review();
        review.setOrder(order);
        review.setReviewer(reviewer);
        review.setReviewee(reviewee);
        review.setRating(request.rating());
        review.setComment(request.comment().trim());

        // Recalculate average rating atomically within this transaction
        double newAverage = (reviewee.getAverageRating() * reviewee.getRatingCount() + request.rating())
                / (reviewee.getRatingCount() + 1);
        reviewee.setAverageRating(newAverage);
        reviewee.setRatingCount(reviewee.getRatingCount() + 1);
        users.save(reviewee);

        Review saved = reviews.save(review);
        if (request.rating() >= 4) {
            reputationService.recordPositiveRating(reviewee);
        }
        log.debug("Review created: order={} reviewer={}", order.getId(), reviewer.getId());
        return toResponse(saved);
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getOrder().getId(),
                review.getReviewer().getId(),
                review.getReviewer().getName(),
                review.getReviewee().getId(),
                review.getReviewee().getName(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
