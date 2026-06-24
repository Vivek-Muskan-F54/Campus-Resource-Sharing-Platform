package com.campusshare.controller;

import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import com.campusshare.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/notes")
    public Page<RecommendedNoteResponse> notes(
            Authentication authentication,
            @PageableDefault(size = 6, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return recommendationService.recommendedNotes(authentication.getName(), pageable);
    }

    @GetMapping("/products")
    public Page<RecommendedProductResponse> products(
            Authentication authentication,
            @PageableDefault(size = 6, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return recommendationService.recommendedProducts(authentication.getName(), pageable);
    }
}
