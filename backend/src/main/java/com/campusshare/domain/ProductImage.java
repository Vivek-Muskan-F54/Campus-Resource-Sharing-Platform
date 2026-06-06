package com.campusshare.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "product_images", uniqueConstraints = {
        @UniqueConstraint(name = "uq_product_images_order", columnNames = {"product_id", "sort_order"})
})
public class ProductImage extends BaseEntity {
    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "public_id", length = 255)
    private String publicId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
