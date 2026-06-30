package com.campusshare.repository;

import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

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
            @Param("userId") Long userId,
            @Param("activityType") ActivityType activityType,
            @Param("entityType") ActivityEntityType entityType);

    @Query("""
            select a.entityId as entityId, count(a) as activityCount
            from UserActivity a
            where a.entityType = :entityType
              and a.activityType = :activityType
              and a.entityId is not null
            group by a.entityId
            """)
    List<ActivityEntityCountView> countByActivityTypeAndEntityType(
            @Param("activityType") ActivityType activityType,
            @Param("entityType") ActivityEntityType entityType);

    @Query("""
            select distinct a.entityId
            from UserActivity a
            where a.user.id = :userId
              and a.entityType = :entityType
              and a.activityType = :activityType
              and a.entityId is not null
            """)
    List<Long> findDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(
            @Param("userId") Long userId,
            @Param("activityType") ActivityType activityType,
            @Param("entityType") ActivityEntityType entityType);

    @Query(
            value = """
                    select ranked.entity_id
                    from (
                        select a.entity_id,
                               max(a.created_at) as last_activity_at
                        from user_activity a
                        where a.user_id = :userId
                          and a.entity_type = :entityType
                          and a.activity_type = :activityType
                          and a.entity_id is not null
                        group by a.entity_id
                    ) ranked
                    order by ranked.last_activity_at desc, ranked.entity_id desc
                    """,
            countQuery = """
                    select count(*)
                    from (
                        select a.entity_id
                        from user_activity a
                        where a.user_id = :userId
                          and a.entity_type = :entityType
                          and a.activity_type = :activityType
                          and a.entity_id is not null
                        group by a.entity_id
                    ) ranked
                    """,
            nativeQuery = true)
    Page<Long> findRecentDistinctEntityIdsByUserIdAndActivityTypeAndEntityType(
            @Param("userId") Long userId,
            @Param("activityType") ActivityType activityType,
            @Param("entityType") ActivityEntityType entityType,
            Pageable pageable);
}
