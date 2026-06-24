package com.campusshare.service;

import com.campusshare.domain.User;
import com.campusshare.dto.UserActivityDtos.UserActivityCreateRequest;
import com.campusshare.dto.UserActivityDtos.UserActivityResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserActivityService {
    void record(String email, UserActivityCreateRequest request);

    void record(User user, UserActivityCreateRequest request);

    void recordLogin(User user, String source);

    void recordOrderCreated(User user, Long productId, Long orderId);

    Page<UserActivityResponse> me(String email, Pageable pageable);

    Page<UserActivityResponse> admin(Pageable pageable);
}
