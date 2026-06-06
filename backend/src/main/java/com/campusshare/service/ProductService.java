package com.campusshare.service;

import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import com.campusshare.dto.ProductDtos.ProductRequest;
import com.campusshare.dto.ProductDtos.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface ProductService {
    Page<ProductResponse> search(
            String query,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            ItemCondition condition,
            ListingType type,
            ListingStatus status,
            Pageable pageable);

    ProductResponse getById(Long productId);

    Page<ProductResponse> getMyProducts(String email, Pageable pageable);

    ProductResponse create(String email, ProductRequest request);

    ProductResponse update(String email, Long productId, ProductRequest request);

    void delete(String email, Long productId);

    ProductResponse updateStatus(Long productId, ListingStatus status);
}
