package com.campusshare.dto;

import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.hibernate.validator.constraints.URL;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ProductDtos {
    private ProductDtos() {
    }

    public record ProductImageRequest(
            @NotBlank @URL String imageUrl,
            @Size(max = 255) String publicId,
            @PositiveOrZero int sortOrder) {
    }

    public record ProductRequest(
            @NotBlank @Size(max = 140) String title,
            @NotBlank @Size(max = 3000) String description,
            @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
            @NotNull @Positive Long categoryId,
            @NotNull ListingType type,
            @NotNull ItemCondition condition,
            @Size(max = 10) List<@NotBlank @URL String> imageUrls,
            @Valid @Size(max = 10) List<ProductImageRequest> images) {
    }

    public record ProductImageResponse(
            Long id,
            String imageUrl,
            String publicId,
            int sortOrder) {
    }

    public record ProductResponse(
            Long id,
            String title,
            String description,
            BigDecimal price,
            ListingType type,
            ItemCondition condition,
            ListingStatus status,
            Long categoryId,
            String category,
            Long sellerId,
            String seller,
            List<String> imageUrls,
            List<ProductImageResponse> images,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record ProductStatusRequest(@NotNull ListingStatus status) {
    }

    public record UploadResponse(List<String> imageUrls) {
    }
}
