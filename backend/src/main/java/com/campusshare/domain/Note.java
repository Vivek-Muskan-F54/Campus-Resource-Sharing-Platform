package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;
import static com.campusshare.domain.Enums.*;

@Getter @Setter @NoArgsConstructor @Entity
@Table(name = "notes", indexes = {
        @Index(name = "idx_notes_filter", columnList = "status,branch,semester,subject"),
        @Index(name = "idx_notes_uploader_created", columnList = "uploader_id,created_at")
})
public class Note extends BaseEntity {
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id", nullable = false)
    private User uploader;
    @Column(nullable=false, length=140) private String title;
    @Column(nullable=false, length=80) private String branch;
    @Column(nullable=false, length=100) private String subject;
    @Column(nullable=false) private Integer semester;
    @Column(name = "file_url", nullable=false, length = 500) private String fileUrl;
    @Column(name = "public_id", length = 255) private String publicId;
    @Column(name = "original_filename", length = 255) private String originalFilename;
    @Column(name = "content_type", length = 100) private String contentType;
    @Column(name = "file_size") private Long fileSize;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length = 20) private ModerationStatus status = ModerationStatus.PENDING;
    @Column(name = "moderation_remarks", length = 500) private String moderationRemarks;
    @Column(name = "download_count", nullable=false) private long downloadCount = 0;
}
