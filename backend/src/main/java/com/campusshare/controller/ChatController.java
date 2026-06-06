package com.campusshare.controller;

import com.campusshare.dto.ChatDtos.*;
import com.campusshare.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.security.Principal;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

    @GetMapping("/{otherUserId}")
    public ConversationResponse history(
            Authentication authentication,
            @PathVariable Long otherUserId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return chatService.history(authentication.getName(), otherUserId, pageable);
    }

    @GetMapping("/online")
    public List<OnlineUserResponse> onlineUsers() {
        return chatService.onlineUsers();
    }

    @PostMapping("/{otherUserId}/read")
    public int markRead(Authentication authentication, @PathVariable Long otherUserId) {
        return chatService.markConversationRead(authentication.getName(), otherUserId);
    }

    @MessageMapping("/chat.send")
    public void send(Principal principal, @Valid SendMessageRequest request) {
        chatService.send(principal.getName(), request);
    }
}
