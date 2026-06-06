package com.campusshare.service;
import com.campusshare.domain.MarketplaceOrder;
import org.springframework.data.domain.*;
public interface OrderService { MarketplaceOrder request(String email,Long productId); MarketplaceOrder status(String email,Long id,String status); Page<MarketplaceOrder> mine(String email,Pageable pageable); MarketplaceOrder verifyHandover(String email,String token); }
