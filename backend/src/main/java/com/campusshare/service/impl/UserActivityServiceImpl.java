package com.campusshare.service.impl;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.ActivityEntityType;
import com.campusshare.domain.Enums.ActivityType;
import com.campusshare.domain.User;
import com.campusshare.domain.UserActivity;
import com.campusshare.dto.UserActivityDtos.UserActivityCreateRequest;
import com.campusshare.dto.UserActivityDtos.UserActivityResponse;
import com.campusshare.repository.UserActivityRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.UserActivityService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class UserActivityServiceImpl implements UserActivityService {

    private static final Logger log = LoggerFactory.getLogger(UserActivityServiceImpl.class);
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final UserActivityRepository activities;
    private final UserRepository users;
    private final ObjectMapper objectMapper;

    @Override
    public void record(String email, UserActivityCreateRequest request) {
        User user = users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        record(user, request);
    }

    @Override
    public void record(User user, UserActivityCreateRequest request) {
        if (user == null || request == null) {
            return;
        }
        UserActivity activity = new UserActivity();
        activity.setUser(user);
        activity.setActivityType(request.activityType());
        activity.setEntityType(request.entityType());
        activity.setEntityId(request.entityId());
        activity.setMetadata(writeMetadata(request.metadata()));
        UserActivity saved = activities.save(activity);
        log.info("event=user_activity_recorded activity_id={} user_id={} type={} entity_type={} entity_id={}",
                saved.getId(), user.getId(), request.activityType(), request.entityType(), request.entityId());
    }

    @Override
    public void recordLogin(User user, String source) {
        record(user, new UserActivityCreateRequest(
                ActivityType.LOGIN,
                ActivityEntityType.USER,
                user == null ? null : user.getId(),
                metadata("source", source)
        ));
    }

    @Override
    public void recordOrderCreated(User user, Long productId, Long orderId) {
        record(user, new UserActivityCreateRequest(
                ActivityType.ORDER_PRODUCT,
                ActivityEntityType.PRODUCT,
                productId,
                metadata("orderId", orderId)
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserActivityResponse> me(String email, Pageable pageable) {
        User user = users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return activities.findByUserId(user.getId(), pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserActivityResponse> admin(Pageable pageable) {
        return activities.findAll(pageable).map(this::toResponse);
    }

    private UserActivityResponse toResponse(UserActivity activity) {
        return new UserActivityResponse(
                activity.getId(),
                activity.getUser().getId(),
                activity.getUser().getName(),
                activity.getActivityType(),
                activity.getEntityType(),
                activity.getEntityId(),
                readMetadata(activity.getMetadata()),
                activity.getCreatedAt()
        );
    }

    private Map<String, Object> metadata(String key, Object value) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (key != null && value != null) {
            metadata.put(key, value);
        }
        return metadata;
    }

    private String writeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialise activity metadata", exception);
        }
    }

    private Map<String, Object> readMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(metadata, MAP_TYPE);
        } catch (Exception exception) {
            log.warn("Unable to parse activity metadata");
            return Collections.emptyMap();
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
