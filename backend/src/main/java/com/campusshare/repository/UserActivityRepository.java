package com.campusshare.repository;

import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

    @EntityGraph(attributePaths = "user")
    Page<UserActivity> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<UserActivity> findAll(Pageable pageable);

    @Query("""
            select a.entityId as entityId, count(a) as activityCount
            from UserActivity a
            where a.user.id = :userId
              and a.entityType = :entityType
              and a.activityType = :activityType
              and a.entityId is not null
            group by a.entityId
            """)
    List<ActivityEntityCountView> countByUserIdAndActivityTypeAndEntityType(
            Long userId,
            ActivityType activityType,
            ActivityEntityType entityType);

    @Query("""
            select distinct a.entityId
            from UserActivity a
            where a.user.id = :userId
              and a.entityType = :entityType
              and a.activityType = :activityType
              and a.entityId is not null
            """)
    List<Long> findDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(
            Long userId,
            ActivityType activityType,
            ActivityEntityType entityType);
}
