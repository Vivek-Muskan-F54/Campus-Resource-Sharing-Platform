package com.campusshare.domain;

import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_products_search", columnList = "status,category_id,transaction_type,item_condition,price"),
        @Index(name = "idx_products_seller_created", columnList = "seller_id,created_at")
})
public class Product extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(nullable = false, length = 3000)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 20)
    private ListingType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", nullable = false, length = 20)
    private ItemCondition condition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ListingStatus status = ListingStatus.ACTIVE;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProductImage> images = new ArrayList<>();

    public void replaceImages(List<ProductImage> newImages) {
        images.clear();
        newImages.forEach(this::addImage);
    }

    public void addImage(ProductImage image) {
        image.setProduct(this);
        images.add(image);
    }
}
