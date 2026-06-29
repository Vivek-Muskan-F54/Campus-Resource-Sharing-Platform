package com.campusshare.controller;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.domain.Notification;
import com.campusshare.domain.User;
import com.campusshare.domain.Verification;
import com.campusshare.dto.ContentDtos.ModerationRequest;
import com.campusshare.dto.ContentDtos.VerificationRequest;
import com.campusshare.dto.ContentDtos.VerificationResponse;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.repository.VerificationRepository;
import com.campusshare.service.ReputationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/verifications")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationRepository repo;
    private final UserRepository users;
    private final NotificationRepository notifications;
    private final ReputationService reputationService;

    /**
     * Submit or re-submit an ID-card URL for verification.
     * Only allowed when the student has no existing approved verification.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VerificationResponse submit(
            Authentication authentication,
            @Valid @RequestBody VerificationRequest request) {

        User student = findUser(authentication.getName());

        // Prevent re-submission if already approved
        repo.findByStudentId(student.getId()).ifPresent(existing -> {
            if (existing.getStatus() == VerificationStatus.APPROVED) {
                throw new BadRequestException("Your verification is already approved");
            }
        });

        Verification verification = repo.findByStudentId(student.getId())
                .orElseGet(Verification::new);
        verification.setStudent(student);
        verification.setIdCardUrl(request.idCardUrl());
        verification.setStatus(VerificationStatus.PENDING);
        student.setVerificationStatus(VerificationStatus.PENDING);
        users.save(student);

        return toResponse(repo.save(verification));
    }

    /** Returns the current user's own verification record. */
    @GetMapping("/mine")
    public VerificationResponse mine(Authentication authentication) {
        User student = findUser(authentication.getName());
        Verification verification = repo.findByStudentId(student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No verification request found"));
        return toResponse(verification);
    }

    /** Admin: list all verifications filtered by status. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<VerificationResponse> all(
            @RequestParam(defaultValue = "PENDING") VerificationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return repo.findByStatus(status, pageable).map(this::toResponse);
    }

    /** Admin: approve or reject a verification by ID. */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public VerificationResponse moderate(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ModerationRequest request) {

        Verification verification = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verification not found"));

        VerificationStatus newStatus;
        try {
            newStatus = VerificationStatus.valueOf(request.status().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid verification status: " + request.status());
        }

        User admin = findUser(authentication.getName());
        verification.setStatus(newStatus);
        verification.setAdminRemarks(request.remarks());
        verification.setReviewedBy(admin);
        verification.setReviewedAt(Instant.now());
        verification.getStudent().setVerificationStatus(newStatus);
        users.save(verification.getStudent());

        Notification notification = new Notification();
        notification.setRecipient(verification.getStudent());
        notification.setType(NotificationType.VERIFICATION);
        notification.setMessage("Your ID card verification was " + newStatus.name().toLowerCase());
        notification.setLink("/verification");
        notifications.save(notification);

        if (newStatus == VerificationStatus.APPROVED) {
            reputationService.recordVerifiedAccount(verification.getStudent());
        }

        return toResponse(repo.save(verification));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private VerificationResponse toResponse(Verification v) {
        return new VerificationResponse(
                v.getId(),
                v.getStudent().getId(),
                v.getStudent().getName(),
                v.getStudent().getEmail(),
                v.getIdCardUrl(),
                v.getStatus(),
                v.getAdminRemarks(),
                v.getReviewedAt(),
                v.getReviewedBy() == null ? null : v.getReviewedBy().getName(),
                v.getCreatedAt(),
                v.getUpdatedAt()
        );
    }

    private User findUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
