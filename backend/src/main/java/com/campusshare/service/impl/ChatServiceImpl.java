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

import java.util.List;

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
}
