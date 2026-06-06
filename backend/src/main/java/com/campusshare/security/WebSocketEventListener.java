package com.campusshare.security;

import com.campusshare.repository.UserRepository;
import com.campusshare.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository users;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal == null) {
            return;
        }
        Long userId = resolveUserId(principal.getName());
        if (userId != null) {
            presenceService.userConnected(userId);
            messagingTemplate.convertAndSend("/topic/presence", Map.of("onlineUsers", presenceService.onlineUsers()));
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) {
            return;
        }
        Long userId = resolveUserId(principal.getName());
        if (userId != null) {
            presenceService.userDisconnected(userId);
            messagingTemplate.convertAndSend("/topic/presence", Map.of("onlineUsers", presenceService.onlineUsers()));
        }
    }

    private Long resolveUserId(String principalName) {
        return users.findByEmail(principalName).map(user -> user.getId()).orElse(null);
    }
}
