package com.campusshare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CategoryDtos {
    private CategoryDtos() {
    }

    public record CategoryRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 500) String description) {
    }

    public record CategoryResponse(Long id, String name, String description) {
    }
}
