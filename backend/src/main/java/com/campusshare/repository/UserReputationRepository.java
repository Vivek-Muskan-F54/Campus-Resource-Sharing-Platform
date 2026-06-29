package com.campusshare.repository;

import com.campusshare.domain.UserReputation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserReputationRepository extends JpaRepository<UserReputation, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserReputation> findByUser_Id(Long userId);

    @EntityGraph(attributePaths = "user")
    List<UserReputation> findByUser_IdIn(Collection<Long> userIds);

    @EntityGraph(attributePaths = "user")
    Page<UserReputation> findAllByOrderByScoreDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select r from UserReputation r
            join fetch r.user
            where r.user.id = :userId
            """)
    Optional<UserReputation> findByUserIdForUpdate(@Param("userId") Long userId);
}
