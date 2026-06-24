package com.campusshare.controller;

import com.campusshare.common.ApiResponse;
import com.campusshare.dto.UserActivityDtos.UserActivityCreateRequest;
import com.campusshare.dto.UserActivityDtos.UserActivityResponse;
import com.campusshare.service.UserActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class UserActivityController {

    private final UserActivityService activityService;

    @PostMapping
    public ApiResponse<Void> record(
            Authentication authentication,
            @Valid @RequestBody UserActivityCreateRequest request) {
        activityService.record(authentication.getName(), request);
        return ApiResponse.ok("Activity recorded");
    }

    @GetMapping("/me")
    public Page<UserActivityResponse> me(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return activityService.me(authentication.getName(), pageable);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserActivityResponse> admin(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return activityService.admin(pageable);
    }
}
