package com.campusshare.controller;

import com.campusshare.common.BadRequestException;
import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import com.campusshare.dto.ProductDtos.*;
import com.campusshare.service.ProductService;
import com.campusshare.service.StorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping({"/api/products", "/api/listings"})
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final StorageService storageService;

    @GetMapping
    public Page<ProductResponse> search(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(name = "category", required = false) Long legacyCategoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) ItemCondition condition,
            @RequestParam(required = false) ListingType type,
            @RequestParam(required = false) ListingStatus status,
            @PageableDefault(size = 12, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return productService.search(
                query,
                categoryId != null ? categoryId : legacyCategoryId,
                minPrice,
                maxPrice,
                condition,
                type,
                status,
                pageable);
    }

    @GetMapping("/{productId}")
    public ProductResponse getById(@PathVariable Long productId) {
        return productService.getById(productId);
    }

    @GetMapping("/mine")
    public Page<ProductResponse> getMyProducts(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return productService.getMyProducts(authentication.getName(), pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(
            Authentication authentication,
            @Valid @RequestBody ProductRequest request) {
        return productService.create(authentication.getName(), request);
    }

    @PutMapping("/{productId}")
    public ProductResponse update(
            Authentication authentication,
            @PathVariable Long productId,
            @Valid @RequestBody ProductRequest request) {
        return productService.update(authentication.getName(), productId, request);
    }

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long productId) {
        productService.delete(authentication.getName(), productId);
    }

    @PatchMapping("/{productId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse updateStatus(
            @PathVariable Long productId,
            @Valid @RequestBody ProductStatusRequest request) {
        return productService.updateStatus(productId, request.status());
    }

    @PostMapping("/images")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponse uploadImages(@RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.size() > 10) {
            throw new BadRequestException("Upload between 1 and 10 product images");
        }
        for (MultipartFile file : files) {
            if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
                throw new BadRequestException("Only non-empty image files are allowed");
            }
        }
        List<String> urls = files.stream()
                .map(file -> storageService.upload(file, "campus-share/products"))
                .toList();
        return new UploadResponse(urls);
    }
}
