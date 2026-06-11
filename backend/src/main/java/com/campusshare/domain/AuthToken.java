package com.campusshare.domain;

import com.campusshare.domain.Enums.AuthTokenPurpose;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "auth_tokens", indexes = {
        @Index(name = "idx_auth_tokens_user", columnList = "user_id"),
        @Index(name = "idx_auth_tokens_purpose", columnList = "purpose"),
        @Index(name = "idx_auth_tokens_expiry", columnList = "expires_at")
})
@AttributeOverrides({
        @AttributeOverride(name = "id", column = @Column(name = "auth_token_id")),
        @AttributeOverride(name = "createdAt", column = @Column(name = "created_at", nullable = false, updatable = false)),
        @AttributeOverride(name = "updatedAt", column = @Column(name = "updated_at", nullable = false))
})
public class AuthToken extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 40)
    private AuthTokenPurpose purpose;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "is_revoked", nullable = false)
    private boolean revoked = false;
}
