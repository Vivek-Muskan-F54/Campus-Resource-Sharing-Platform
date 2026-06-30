package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Message;
import com.campusshare.domain.Product;
import com.campusshare.domain.User;
import com.campusshare.dto.ChatDtos.*;
import com.campusshare.repository.MessageRepository;
import com.campusshare.repository.ProductRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.ChatService;
import com.campusshare.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatServiceImpl implements ChatService {
    private final MessageRepository messages;
    private final UserRepository users;
    private final ProductRepository products;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public ConversationResponse history(String email, Long otherUserId, Pageable pageable) {
        User me = findUser(email);
        User other = users.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Page<Message> page = messages.conversation(me.getId(), otherUserId, pageable);
        return new ConversationResponse(
                other.getId(),
                other.getName(),
                page.map(this::toResponse).getContent());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> conversations(String email) {
        User me = findUser(email);
        List<Message> messagesForUser = messages.findAllConversationMessagesForUser(me.getId());
        if (messagesForUser.isEmpty()) {
            return List.of();
        }

        Map<Long, ConversationSummaryBuilder> summaries = new LinkedHashMap<>();
        for (Message message : messagesForUser) {
            Long otherUserId = message.getSender().getId().equals(me.getId())
                    ? message.getRecipient().getId()
                    : message.getSender().getId();
            ConversationSummaryBuilder builder = summaries.computeIfAbsent(otherUserId,
                    id -> new ConversationSummaryBuilder(
                            id,
                            message.getSender().getId().equals(me.getId()) ? message.getRecipient() : message.getSender()));
            if (builder.lastMessage == null) {
                builder.lastMessage = message;
            }
            if (message.getRecipient().getId().equals(me.getId()) && !message.isReadFlag()) {
                builder.unreadCount += 1;
            }
        }

        List<ConversationSummaryResponse> result = new ArrayList<>();
        for (ConversationSummaryBuilder builder : summaries.values()) {
            Message latest = builder.lastMessage;
            if (latest == null) {
                continue;
            }
            result.add(new ConversationSummaryResponse(
                    builder.otherUser.getId(),
                    builder.otherUser.getEmail(),
                    builder.otherUser.getName(),
                    latest.getSender().getId(),
                    latest.getContent(),
                    latest.getProduct() == null ? null : latest.getProduct().getId(),
                    latest.getProduct() == null ? null : latest.getProduct().getTitle(),
                    presenceService.isOnline(builder.otherUser.getId()),
                    builder.unreadCount,
                    latest.getCreatedAt()));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OnlineUserResponse> onlineUsers() {
        return presenceService.onlineUsers();
    }

    @Override
    public MessageResponse send(String email, SendMessageRequest request) {
        User sender = findUser(email);
        User recipient = users.findById(request.recipientId())
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        if (sender.getId().equals(recipient.getId())) {
            throw new BadRequestException("Cannot send a message to yourself");
        }

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(request.content().trim());

        if (request.productId() != null) {
            Product product = products.findById(request.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            message.setProduct(product);
        }

        Message saved = messages.save(message);
        MessageResponse response = toResponse(saved);
        messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", response);
        messagingTemplate.convertAndSendToUser(sender.getEmail(), "/queue/messages", response);
        return response;
    }

    @Override
    public int markConversationRead(String email, Long otherUserId) {
        User me = findUser(email);
        users.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return messages.markConversationRead(me.getId(), otherUserId);
    }

    private User findUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private MessageResponse toResponse(Message message) {
        Long productId = message.getProduct() == null ? null : message.getProduct().getId();
        String productTitle = message.getProduct() == null ? null : message.getProduct().getTitle();
        return new MessageResponse(
                message.getId(),
                message.getSender().getId(),
                message.getSender().getName(),
                message.getRecipient().getId(),
                message.getRecipient().getName(),
                productId,
                productTitle,
                message.getContent(),
                message.isReadFlag(),
                message.getReadAt(),
                message.getCreatedAt());
    }

    private static final class ConversationSummaryBuilder {
        private final Long otherUserId;
        private final User otherUser;
        private Message lastMessage;
        private long unreadCount;

        private ConversationSummaryBuilder(Long otherUserId, User otherUser) {
            this.otherUserId = otherUserId;
            this.otherUser = otherUser;
        }
    }
}
