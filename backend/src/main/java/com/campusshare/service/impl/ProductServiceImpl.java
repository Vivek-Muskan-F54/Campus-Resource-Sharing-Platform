package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Category;
import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.domain.Product;
import com.campusshare.domain.ProductImage;
import com.campusshare.domain.User;
import com.campusshare.dto.ProductDtos.*;
import com.campusshare.repository.CategoryRepository;
import com.campusshare.repository.ProductRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {
    private final ProductRepository products;
    private final UserRepository users;
    private final CategoryRepository categories;

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> search(
            String query,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            ItemCondition condition,
            ListingType type,
            ListingStatus status,
            Pageable pageable) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new BadRequestException("Minimum price cannot be greater than maximum price");
        }
        ListingStatus effectiveStatus = status == null ? ListingStatus.ACTIVE : status;
        return products.search(
                        blankToNull(query),
                        categoryId,
                        minPrice,
                        maxPrice,
                        condition,
                        type,
                        effectiveStatus,
                        pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getById(Long productId) {
        Product product = findProduct(productId);
        if (product.getStatus() == ListingStatus.DELETED) {
            throw new ResourceNotFoundException("Product not found");
        }
        return toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getMyProducts(String email, Pageable pageable) {
        return products.findBySellerId(findUser(email).getId(), pageable).map(this::toResponse);
    }

    @Override
    public ProductResponse create(String email, ProductRequest request) {
        User seller = findUser(email);
        if (seller.getVerificationStatus() != VerificationStatus.APPROVED) {
            throw new BadRequestException("Student verification is required before creating products");
        }

        Product product = new Product();
        product.setSeller(seller);
        applyRequest(product, request);
        return toResponse(products.save(product));
    }

    @Override
    public ProductResponse update(String email, Long productId, ProductRequest request) {
        Product product = findOwnedProduct(email, productId);
        if (product.getStatus() == ListingStatus.DELETED) {
            throw new BadRequestException("Deleted products cannot be edited");
        }
        applyRequest(product, request);
        return toResponse(products.save(product));
    }

    @Override
    public void delete(String email, Long productId) {
        Product product = findOwnedProduct(email, productId);
        product.setStatus(ListingStatus.DELETED);
        products.save(product);
    }

    @Override
    public ProductResponse updateStatus(Long productId, ListingStatus status) {
        Product product = findProduct(productId);
        product.setStatus(status);
        return toResponse(products.save(product));
    }

    private void applyRequest(Product product, ProductRequest request) {
        Category category = categories.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        product.setTitle(request.title().trim());
        product.setDescription(request.description().trim());
        product.setPrice(request.price());
        product.setCategory(category);
        product.setType(request.type());
        product.setCondition(request.condition());
        product.replaceImages(buildImages(request));
    }

    private List<ProductImage> buildImages(ProductRequest request) {
        List<ProductImage> images = new ArrayList<>();
        if (request.images() != null && !request.images().isEmpty()) {
            request.images().stream()
                    .sorted(Comparator.comparingInt(ProductImageRequest::sortOrder))
                    .forEach(image -> images.add(newImage(image.imageUrl(), image.publicId(), image.sortOrder())));
        } else if (request.imageUrls() != null) {
            for (int index = 0; index < request.imageUrls().size(); index++) {
                images.add(newImage(request.imageUrls().get(index), null, index));
            }
        }
        long distinctSortOrders = images.stream().map(ProductImage::getSortOrder).distinct().count();
        if (distinctSortOrders != images.size()) {
            throw new BadRequestException("Product image sort orders must be unique");
        }
        return images;
    }

    private ProductImage newImage(String imageUrl, String publicId, int sortOrder) {
        ProductImage image = new ProductImage();
        image.setImageUrl(imageUrl);
        image.setPublicId(publicId);
        image.setSortOrder(sortOrder);
        return image;
    }

    private Product findOwnedProduct(String email, Long productId) {
        Product product = findProduct(productId);
        if (!product.getSeller().getEmail().equalsIgnoreCase(email)) {
            throw new BadRequestException("Only the seller can modify this product");
        }
        return product;
    }

    private Product findProduct(Long productId) {
        return products.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    private User findUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ProductResponse toResponse(Product product) {
        List<ProductImageResponse> images = product.getImages().stream()
                .map(image -> new ProductImageResponse(
                        image.getId(),
                        image.getImageUrl(),
                        image.getPublicId(),
                        image.getSortOrder()))
                .toList();

        return new ProductResponse(
                product.getId(),
                product.getTitle(),
                product.getDescription(),
                product.getPrice(),
                product.getType(),
                product.getCondition(),
                product.getStatus(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getSeller().getId(),
                product.getSeller().getName(),
                images.stream().map(ProductImageResponse::imageUrl).toList(),
                images,
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
