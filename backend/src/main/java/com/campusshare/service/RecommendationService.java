package com.campusshare.service;

import com.campusshare.dto.RecommendationDtos.RecommendedNoteResponse;
import com.campusshare.dto.RecommendationDtos.RecommendedProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RecommendationService {
    Page<RecommendedNoteResponse> recommendedNotes(String email, Pageable pageable);

    Page<RecommendedProductResponse> recommendedProducts(String email, Pageable pageable);
}
