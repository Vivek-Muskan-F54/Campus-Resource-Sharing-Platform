package com.campusshare.controller;
import com.campusshare.domain.MarketplaceOrder;
import com.campusshare.dto.MarketplaceDtos.*;
import com.campusshare.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/orders") @RequiredArgsConstructor
public class OrderController {
 private final OrderService service;
 @PostMapping public MarketplaceOrder request(Authentication a,@Valid @RequestBody OrderRequest r){return service.request(a.getName(),r.effectiveProductId());}
 @GetMapping public Page<MarketplaceOrder> mine(Authentication a,@PageableDefault(size=20,sort="createdAt",direction=Sort.Direction.DESC)Pageable p){return service.mine(a.getName(),p);}
 @PatchMapping("/{id}/status") public MarketplaceOrder status(Authentication a,@PathVariable Long id,@Valid @RequestBody StatusRequest r){return service.status(a.getName(),id,r.status());}
 @PostMapping("/handover/{token}") public MarketplaceOrder handover(Authentication a,@PathVariable String token){return service.verifyHandover(a.getName(),token);}
}
