package com.campusshare.repository;

import com.campusshare.domain.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

    @EntityGraph(attributePaths = "user")
    Page<UserActivity> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<UserActivity> findAll(Pageable pageable);
}
