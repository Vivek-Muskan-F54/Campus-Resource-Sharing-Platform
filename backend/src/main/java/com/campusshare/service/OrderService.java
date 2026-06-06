package com.campusshare.service;

import com.campusshare.dto.MarketplaceDtos.OrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {
    OrderResponse request(String email, Long productId);
    OrderResponse status(String email, Long id, String status);
    Page<OrderResponse> mine(String email, Pageable pageable);
    OrderResponse verifyHandover(String email, String token);
}
