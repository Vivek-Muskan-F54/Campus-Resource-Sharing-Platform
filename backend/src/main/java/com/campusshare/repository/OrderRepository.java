package com.campusshare.repository;
import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.domain.Enums.OrderStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface OrderRepository extends JpaRepository<MarketplaceOrder,Long> {
    Page<MarketplaceOrder> findByBuyerIdOrSellerId(Long buyerId,Long sellerId,Pageable pageable);

    Optional<MarketplaceOrder> findByHandoverTokenHash(String handoverTokenHash);

    @Query("""
            select distinct o.product.id
            from MarketplaceOrder o
            where o.buyer.id = :buyerId
              and o.status = :status
            """)
    List<Long> findDistinctProductIdsByBuyerIdAndStatus(@Param("buyerId") Long buyerId, @Param("status") OrderStatus status);
}
