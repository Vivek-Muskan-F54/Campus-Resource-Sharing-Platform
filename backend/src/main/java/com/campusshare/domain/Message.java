package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_conversation_sent", columnList = "sender_id,recipient_id,sent_at"),
        @Index(name = "idx_messages_recipient_read", columnList = "recipient_id,is_read,sent_at")
})
@AttributeOverrides({
        @AttributeOverride(name = "id", column = @Column(name = "message_id")),
        @AttributeOverride(name = "createdAt", column = @Column(name = "sent_at", nullable = false, updatable = false)),
        @AttributeOverride(name = "updatedAt", column = @Column(name = "updated_at", nullable = false))
})
public class Message extends BaseEntity {
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "message_text", nullable = false, length = 2000)
    private String content;

    @Column(name = "is_read", nullable = false)
    private boolean readFlag = false;

    @Column(name = "read_at")
    private Instant readAt;
}
