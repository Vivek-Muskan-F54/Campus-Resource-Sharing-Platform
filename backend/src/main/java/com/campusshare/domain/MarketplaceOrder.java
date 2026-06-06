package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import static com.campusshare.domain.Enums.*;

@Getter @Setter @NoArgsConstructor @Entity
@Table(name="marketplace_orders", indexes = {
        @Index(name = "idx_orders_buyer_status", columnList = "buyer_id,status,requested_at"),
        @Index(name = "idx_orders_seller_status", columnList = "seller_id,status,requested_at"),
        @Index(name = "idx_orders_product_status", columnList = "product_id,status,requested_at")
})
public class MarketplaceOrder extends BaseEntity {
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private OrderStatus status = OrderStatus.REQUESTED;
    @Column(name="handover_token_hash", unique=true, length=64) private String handoverTokenHash;
    @Transient private String handoverToken;
    private Instant completedAt;
}
