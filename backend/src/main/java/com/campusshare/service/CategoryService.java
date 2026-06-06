package com.campusshare.service;

import com.campusshare.dto.CategoryDtos.CategoryRequest;
import com.campusshare.dto.CategoryDtos.CategoryResponse;

import java.util.List;

public interface CategoryService {
    List<CategoryResponse> getAll();

    CategoryResponse create(CategoryRequest request);
}
