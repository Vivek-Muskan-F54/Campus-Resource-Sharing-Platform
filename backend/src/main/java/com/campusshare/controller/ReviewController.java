package com.campusshare.controller;
import com.campusshare.common.BadRequestException;
import com.campusshare.domain.*;
import com.campusshare.domain.Enums.OrderStatus;
import com.campusshare.dto.MarketplaceDtos.ReviewRequest;
import com.campusshare.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/reviews") @RequiredArgsConstructor
public class ReviewController {
 private final ReviewRepository repo; private final OrderRepository orders; private final UserRepository users;
 @GetMapping("/user/{id}") public Page<Review> user(@PathVariable Long id,Pageable p){return repo.findByRevieweeId(id,p);}
 @PostMapping public Review create(Authentication a,@Valid @RequestBody ReviewRequest r){User reviewer=users.findByEmail(a.getName()).orElseThrow();MarketplaceOrder o=orders.findById(r.orderId()).orElseThrow();if(o.getStatus()!=OrderStatus.COMPLETED)throw new BadRequestException("Order must be completed");if(repo.existsByOrderIdAndReviewerId(o.getId(),reviewer.getId()))throw new BadRequestException("Order already reviewed");User reviewee=o.getBuyer().getId().equals(reviewer.getId())?o.getSeller():o.getBuyer();Review v=new Review();v.setOrder(o);v.setReviewer(reviewer);v.setReviewee(reviewee);v.setRating(r.rating());v.setComment(r.comment());reviewee.setAverageRating((reviewee.getAverageRating()*reviewee.getRatingCount()+r.rating())/(reviewee.getRatingCount()+1));reviewee.setRatingCount(reviewee.getRatingCount()+1);users.save(reviewee);return repo.save(v);}
}
