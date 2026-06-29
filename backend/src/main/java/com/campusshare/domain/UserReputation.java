package com.campusshare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "user_reputation", indexes = {
        @Index(name = "idx_user_reputation_user", columnList = "user_id", unique = true),
        @Index(name = "idx_user_reputation_score", columnList = "score")
})
public class UserReputation extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private long score = 0;

    @Column(nullable = false, length = 60)
    private String level = "Bronze Contributor";

    @Column(nullable = false, length = 60)
    private String badge = "Bronze Contributor";
}
