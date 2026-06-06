package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @Entity
@Table(
    name = "review",
    uniqueConstraints = @UniqueConstraint(columnNames = {"order_id","reviewer_id"}),
    indexes = {
        @Index(name = "idx_review_reviewee", columnList = "reviewee_id,created_at"),
        @Index(name = "idx_review_order_reviewer", columnList = "order_id,reviewer_id")
    }
)
public class Review extends BaseEntity {
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private MarketplaceOrder order;
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;
    @Column(nullable=false) private Integer rating;
    @Column(nullable=false, length=1000) private String comment;
}
