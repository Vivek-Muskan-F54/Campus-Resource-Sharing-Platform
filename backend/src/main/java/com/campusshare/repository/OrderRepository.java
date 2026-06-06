package com.campusshare.repository;
import com.campusshare.domain.MarketplaceOrder;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OrderRepository extends JpaRepository<MarketplaceOrder,Long> { Page<MarketplaceOrder> findByBuyerIdOrSellerId(Long buyerId,Long sellerId,Pageable pageable); Optional<MarketplaceOrder> findByHandoverTokenHash(String handoverTokenHash); }
