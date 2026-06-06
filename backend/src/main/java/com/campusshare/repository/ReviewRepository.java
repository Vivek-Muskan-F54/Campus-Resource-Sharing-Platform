package com.campusshare.repository;
import com.campusshare.domain.Review;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ReviewRepository extends JpaRepository<Review,Long> { Page<Review> findByRevieweeId(Long id,Pageable pageable); boolean existsByOrderIdAndReviewerId(Long orderId,Long reviewerId); }
