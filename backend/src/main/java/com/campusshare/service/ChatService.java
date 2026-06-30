package com.campusshare.service;

import com.campusshare.dto.ChatDtos.ConversationResponse;
import com.campusshare.dto.ChatDtos.ConversationSummaryResponse;
import com.campusshare.dto.ChatDtos.MessageResponse;
import com.campusshare.dto.ChatDtos.OnlineUserResponse;
import com.campusshare.dto.ChatDtos.SendMessageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ChatService {
    ConversationResponse history(String email, Long otherUserId, Pageable pageable);

    List<ConversationSummaryResponse> conversations(String email);

    List<OnlineUserResponse> onlineUsers();

    MessageResponse send(String email, SendMessageRequest request);

    int markConversationRead(String email, Long otherUserId);
}
