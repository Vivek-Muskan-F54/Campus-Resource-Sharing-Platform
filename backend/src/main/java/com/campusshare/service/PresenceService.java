package com.campusshare.service;

import com.campusshare.dto.ChatDtos.OnlineUserResponse;

import java.util.List;

public interface PresenceService {
    void userConnected(Long userId);

    void userDisconnected(Long userId);

    List<OnlineUserResponse> onlineUsers();

    boolean isOnline(Long userId);
}
