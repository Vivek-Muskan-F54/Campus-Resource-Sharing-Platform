package com.campusshare.controller;

import com.campusshare.dto.MarketplaceDtos.OrderRequest;
import com.campusshare.dto.MarketplaceDtos.OrderResponse;
import com.campusshare.dto.MarketplaceDtos.StatusRequest;
import com.campusshare.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** Place a new order request for a product. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse request(
            Authentication authentication,
            @Valid @RequestBody OrderRequest request) {
        return orderService.request(authentication.getName(), request.effectiveProductId());
    }

    /** Get all orders for the currently authenticated user (buyer or seller). */
    @GetMapping
    public Page<OrderResponse> mine(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return orderService.mine(authentication.getName(), pageable);
    }

    /** Advance or cancel an order's status. */
    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody StatusRequest request) {
        return orderService.status(authentication.getName(), id, request.status());
    }

    /** Complete an order via a raw token in the URL path (alternative to /api/qr/verify). */
    @PostMapping("/handover/{token}")
    public OrderResponse handover(
            Authentication authentication,
            @PathVariable String token) {
        return orderService.verifyHandover(authentication.getName(), token);
    }
}
