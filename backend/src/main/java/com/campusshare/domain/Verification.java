package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import static com.campusshare.domain.Enums.*;

@Getter @Setter @NoArgsConstructor @Entity
@Table(name = "verification", indexes = {
        @Index(name = "idx_verification_status_created", columnList = "status,created_at"),
        @Index(name = "idx_verification_student", columnList = "student_id")
})
public class Verification extends BaseEntity {
    @OneToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;
    @Column(name = "id_card_url", nullable=false, length = 500) private String idCardUrl;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length = 20) private VerificationStatus status = VerificationStatus.PENDING;
    @Column(name = "admin_remarks", length = 500) private String adminRemarks;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;
    @Column(name = "reviewed_at") private Instant reviewedAt;
}
