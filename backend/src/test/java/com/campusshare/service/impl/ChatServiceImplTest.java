package com.campusshare.service.impl;

import com.campusshare.domain.Message;
import com.campusshare.domain.User;
import com.campusshare.dto.ChatDtos.ConversationSummaryResponse;
import com.campusshare.repository.MessageRepository;
import com.campusshare.repository.ProductRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.PresenceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class ChatServiceImplTest {

    @Mock private MessageRepository messages;
    @Mock private UserRepository users;
    @Mock private ProductRepository products;
    @Mock private PresenceService presenceService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private ChatServiceImpl chatService;

    @Test
    @DisplayName("conversations returns latest message previews and unread counts")
    void conversations_returnsSummaries() {
        User me = user(11L, "me@campus.edu", "Me");
        User alice = user(12L, "alice@campus.edu", "Alice");
        User bob = user(13L, "bob@campus.edu", "Bob");

        Message aliceUnread = message(101L, alice, me, "Hey, are you free?", Instant.parse("2026-06-30T10:15:00Z"), false);
        Message aliceLatest = message(102L, me, alice, "Sure, let us talk.", Instant.parse("2026-06-30T10:20:00Z"), true);
        Message bobLatest = message(103L, bob, me, "Check the attachment.", Instant.parse("2026-06-30T09:30:00Z"), false);

        when(users.findByEmail("me@campus.edu")).thenReturn(Optional.of(me));
        when(messages.findAllConversationMessagesForUser(11L)).thenReturn(List.of(aliceLatest, aliceUnread, bobLatest));
        when(presenceService.isOnline(12L)).thenReturn(true);
        when(presenceService.isOnline(13L)).thenReturn(false);

        List<ConversationSummaryResponse> result = chatService.conversations("me@campus.edu");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).otherUserId()).isEqualTo(12L);
        assertThat(result.get(0).otherUserName()).isEqualTo("Alice");
        assertThat(result.get(0).lastMessage()).isEqualTo("Sure, let us talk.");
        assertThat(result.get(0).unreadCount()).isEqualTo(1L);
        assertThat(result.get(0).online()).isTrue();

        assertThat(result.get(1).otherUserId()).isEqualTo(13L);
        assertThat(result.get(1).lastMessage()).isEqualTo("Check the attachment.");
        assertThat(result.get(1).unreadCount()).isEqualTo(1L);
    }

    private static User user(Long id, String email, String name) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setName(name);
        user.setPassword("password");
        user.setCollegeRollNumber("U-" + id);
        return user;
    }

    private static Message message(Long id, User sender, User recipient, String content, Instant createdAt, boolean read) {
        Message message = new Message();
        message.setId(id);
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(content);
        message.setCreatedAt(createdAt);
        message.setUpdatedAt(createdAt);
        message.setReadFlag(read);
        return message;
    }
}
