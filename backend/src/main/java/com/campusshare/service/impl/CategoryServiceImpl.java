package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.domain.Category;
import com.campusshare.dto.CategoryDtos.CategoryRequest;
import com.campusshare.dto.CategoryDtos.CategoryResponse;
import com.campusshare.repository.CategoryRepository;
import com.campusshare.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryServiceImpl implements CategoryService {
    private final CategoryRepository categories;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        return categories.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    public CategoryResponse create(CategoryRequest request) {
        if (categories.existsByNameIgnoreCase(request.name().trim())) {
            throw new BadRequestException("Category already exists");
        }
        Category category = new Category();
        category.setName(request.name().trim());
        category.setDescription(request.description());
        return toResponse(categories.save(category));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getDescription());
    }
}
