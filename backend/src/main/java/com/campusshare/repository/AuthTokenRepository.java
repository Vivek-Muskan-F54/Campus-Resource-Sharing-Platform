package com.campusshare.repository;

import com.campusshare.domain.AuthToken;
import com.campusshare.domain.Enums.AuthTokenPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {
    Optional<AuthToken> findByTokenHashAndPurpose(String tokenHash, AuthTokenPurpose purpose);

    @Modifying
    @Query("update AuthToken t set t.revoked = true where t.user.id = :userId and t.purpose = :purpose and t.revoked = false")
    int revokeAllByUserIdAndPurpose(@Param("userId") Long userId, @Param("purpose") AuthTokenPurpose purpose);

    void deleteByExpiresAtBefore(Instant instant);
}
