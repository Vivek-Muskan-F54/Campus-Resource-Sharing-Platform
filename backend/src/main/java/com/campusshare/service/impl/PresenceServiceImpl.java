package com.campusshare.service.impl;

import com.campusshare.dto.ChatDtos.OnlineUserResponse;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {
    private final UserRepository users;
    private final ConcurrentHashMap<Long, Integer> connectionCounts = new ConcurrentHashMap<>();

    @Override
    public void userConnected(Long userId) {
        connectionCounts.merge(userId, 1, Integer::sum);
    }

    @Override
    public void userDisconnected(Long userId) {
        connectionCounts.computeIfPresent(userId, (id, count) -> count > 1 ? count - 1 : null);
    }

    @Override
    public List<OnlineUserResponse> onlineUsers() {
        return users.findAllById(connectionCounts.keySet()).stream()
                .map(user -> new OnlineUserResponse(user.getId(), user.getEmail(), user.getName()))
                .toList();
    }

    @Override
    public boolean isOnline(Long userId) {
        return connectionCounts.containsKey(userId);
    }
}
