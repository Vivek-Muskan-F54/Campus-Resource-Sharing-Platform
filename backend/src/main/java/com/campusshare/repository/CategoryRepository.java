package com.campusshare.repository;
import com.campusshare.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CategoryRepository extends JpaRepository<Category,Long> {
    boolean existsByNameIgnoreCase(String name);
}
