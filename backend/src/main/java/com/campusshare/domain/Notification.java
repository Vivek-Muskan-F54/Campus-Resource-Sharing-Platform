package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;
import static com.campusshare.domain.Enums.*;

@Getter @Setter @NoArgsConstructor @Entity
@Table(name = "notification", indexes = {
        @Index(name = "idx_notification_recipient_read", columnList = "recipient_id,read_flag"),
        @Index(name = "idx_notification_recipient_created", columnList = "recipient_id,created_at")
})
public class Notification extends BaseEntity {
    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length = 20) private NotificationType type;
    @Column(nullable=false, length=500) private String message;
    @Column(length=200) private String link;
    @Column(name = "read_flag", nullable=false) private boolean readFlag = false;
}
