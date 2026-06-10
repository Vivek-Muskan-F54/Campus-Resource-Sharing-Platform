package com.campusshare.service.impl;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class ProductServiceImplTest {

    private static final String EMAIL = "seller@campus.edu";

    @Mock private ProductRepository products;
    @Mock private UserRepository users;
    @Mock private CategoryRepository categories;

    @InjectMocks private ProductServiceImpl productService;

    @Test
    @DisplayName("create stores a new listing with sorted images")
    void create_listing() {
        User seller = approvedSeller();
        Category category = category(7L, "Electronics");
        ProductRequest request = new ProductRequest(
                "  Graphing Calculator  ",
                "  A reliable calculator for exams  ",
                new BigDecimal("129.99"),
                7L,
                ListingType.SELL,
                ItemCondition.GOOD,
                null,
                List.of(
                        new ProductImageRequest("https://cdn.example.com/b.png", "pub-b", 1),
                        new ProductImageRequest("https://cdn.example.com/a.png", "pub-a", 0)
                ));

        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(seller));
        when(categories.findById(7L)).thenReturn(Optional.of(category));
        when(products.save(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            product.setId(101L);
            return product;
        });

        ProductResponse response = productService.create(EMAIL, request);

        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(productCaptor.capture());
        Product saved = productCaptor.getValue();

        assertThat(saved.getSeller()).isSameAs(seller);
        assertThat(saved.getCategory()).isSameAs(category);
        assertThat(saved.getTitle()).isEqualTo("Graphing Calculator");
        assertThat(saved.getDescription()).isEqualTo("A reliable calculator for exams");
        assertThat(saved.getImages()).hasSize(2);
        assertThat(saved.getImages()).extracting(ProductImage::getSortOrder).containsExactly(0, 1);

        assertThat(response.id()).isEqualTo(101L);
        assertThat(response.title()).isEqualTo("Graphing Calculator");
        assertThat(response.categoryId()).isEqualTo(7L);
        assertThat(response.sellerId()).isEqualTo(11L);
        assertThat(response.status()).isEqualTo(ListingStatus.ACTIVE);
        assertThat(response.imageUrls()).containsExactly(
                "https://cdn.example.com/a.png",
                "https://cdn.example.com/b.png"
        );
    }

    @Test
    @DisplayName("update replaces the listing details and image URLs")
    void update_listing() {
        User seller = approvedSeller();
        Category category = category(7L, "Electronics");
        Product product = ownedProduct(101L, seller, category);
        ProductRequest request = new ProductRequest(
                "  Updated Calculator  ",
                "  Updated description  ",
                new BigDecimal("139.99"),
                7L,
                ListingType.RENT,
                ItemCondition.LIKE_NEW,
                List.of("https://cdn.example.com/one.png", "https://cdn.example.com/two.png"),
                null);

        when(products.findById(101L)).thenReturn(Optional.of(product));
        when(categories.findById(7L)).thenReturn(Optional.of(category));
        when(products.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.update(EMAIL, 101L, request);

        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(productCaptor.capture());
        Product saved = productCaptor.getValue();

        assertThat(saved.getTitle()).isEqualTo("Updated Calculator");
        assertThat(saved.getDescription()).isEqualTo("Updated description");
        assertThat(saved.getType()).isEqualTo(ListingType.RENT);
        assertThat(saved.getCondition()).isEqualTo(ItemCondition.LIKE_NEW);
        assertThat(saved.getImages()).extracting(ProductImage::getImageUrl)
                .containsExactly("https://cdn.example.com/one.png", "https://cdn.example.com/two.png");

        assertThat(response.title()).isEqualTo("Updated Calculator");
        assertThat(response.type()).isEqualTo(ListingType.RENT);
        assertThat(response.condition()).isEqualTo(ItemCondition.LIKE_NEW);
        assertThat(response.imageUrls()).containsExactly(
                "https://cdn.example.com/one.png",
                "https://cdn.example.com/two.png"
        );
    }

    @Test
    @DisplayName("delete marks the listing as deleted")
    void delete_listing() {
        User seller = approvedSeller();
        Category category = category(7L, "Electronics");
        Product product = ownedProduct(101L, seller, category);

        when(products.findById(101L)).thenReturn(Optional.of(product));
        when(products.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productService.delete(EMAIL, 101L);

        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(productCaptor.capture());
        assertThat(productCaptor.getValue().getStatus()).isEqualTo(ListingStatus.DELETED);
    }

    @Test
    @DisplayName("getMyProducts returns the seller's listings")
    void getMyProducts_returnsSellerListings() {
        User seller = approvedSeller();
        Category category = category(7L, "Electronics");
        Product product = ownedProduct(101L, seller, category);
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(seller));
        when(products.findBySellerId(11L, PageRequest.of(0, 20))).thenReturn(new PageImpl<>(List.of(product)));

        Page<ProductResponse> page = productService.getMyProducts(EMAIL, PageRequest.of(0, 20));

        assertThat(page).hasSize(1);
        assertThat(page.getContent().getFirst().id()).isEqualTo(101L);
        assertThat(page.getContent().getFirst().sellerId()).isEqualTo(11L);
    }

    private static User approvedSeller() {
        User seller = new User();
        seller.setId(11L);
        seller.setName("Seller");
        seller.setEmail(EMAIL);
        seller.setPassword("password");
        seller.setCollegeRollNumber("SELLER-01");
        seller.setVerificationStatus(VerificationStatus.APPROVED);
        return seller;
    }

    private static Category category(Long id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }

    private static Product ownedProduct(Long id, User seller, Category category) {
        Product product = new Product();
        product.setId(id);
        product.setSeller(seller);
        product.setCategory(category);
        product.setTitle("Calculator");
        product.setDescription("Original description");
        product.setPrice(new BigDecimal("99.99"));
        product.setType(ListingType.SELL);
        product.setCondition(ItemCondition.GOOD);
        product.setStatus(ListingStatus.ACTIVE);
        ProductImage image = new ProductImage();
        image.setImageUrl("https://cdn.example.com/old.png");
        image.setSortOrder(0);
        image.setProduct(product);
        product.replaceImages(List.of(image));
        return product;
    }
}
