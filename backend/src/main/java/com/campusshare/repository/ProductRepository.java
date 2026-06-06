package com.campusshare.repository;

import com.campusshare.domain.Enums.ItemCondition;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ListingType;
import com.campusshare.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query(
            value = """
                    select distinct p from Product p
                    join fetch p.seller
                    join fetch p.category
                    where (:status is null or p.status = :status)
                      and (:q is null or lower(p.title) like lower(concat('%', :q, '%'))
                           or lower(p.description) like lower(concat('%', :q, '%')))
                      and (:categoryId is null or p.category.id = :categoryId)
                      and (:minPrice is null or p.price >= :minPrice)
                      and (:maxPrice is null or p.price <= :maxPrice)
                      and (:condition is null or p.condition = :condition)
                      and (:type is null or p.type = :type)
                    """,
            countQuery = """
                    select count(p) from Product p
                    where (:status is null or p.status = :status)
                      and (:q is null or lower(p.title) like lower(concat('%', :q, '%'))
                           or lower(p.description) like lower(concat('%', :q, '%')))
                      and (:categoryId is null or p.category.id = :categoryId)
                      and (:minPrice is null or p.price >= :minPrice)
                      and (:maxPrice is null or p.price <= :maxPrice)
                      and (:condition is null or p.condition = :condition)
                      and (:type is null or p.type = :type)
                    """)
    Page<Product> search(
            @Param("q") String q,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("condition") ItemCondition condition,
            @Param("type") ListingType type,
            @Param("status") ListingStatus status,
            Pageable pageable);

    Page<Product> findBySellerId(Long sellerId, Pageable pageable);
    long countByStatus(ListingStatus status);
}
