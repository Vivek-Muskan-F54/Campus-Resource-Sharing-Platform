package com.campusshare.controller;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.domain.Notification;
import com.campusshare.domain.User;
import com.campusshare.domain.Verification;
import com.campusshare.dto.ContentDtos.*;
import com.campusshare.repository.NotificationRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.repository.VerificationRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verifications")
@RequiredArgsConstructor
public class VerificationController {
    private final VerificationRepository repo;
    private final UserRepository users;
    private final NotificationRepository notifications;

    @PostMapping
    public Verification submit(Authentication a, @Valid @RequestBody VerificationRequest r) {
        User u = user(a.getName());
        Verification v = repo.findByStudentId(u.getId()).orElseGet(Verification::new);
        v.setStudent(u);
        v.setIdCardUrl(r.idCardUrl());
        v.setStatus(VerificationStatus.PENDING);
        u.setVerificationStatus(VerificationStatus.PENDING);
        users.save(u);
        return repo.save(v);
    }

    @GetMapping("/mine")
    public Verification mine(Authentication a) {
        return repo.findByStudentId(user(a.getName()).getId())
                .orElseThrow(() -> new ResourceNotFoundException("Verification not found"));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public org.springframework.data.domain.Page<Verification> all(@RequestParam(defaultValue = "PENDING") VerificationStatus status, Pageable p) {
        return repo.findByStatus(status, p);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Verification moderate(Authentication authentication, @PathVariable Long id, @Valid @RequestBody ModerationRequest r) {
        Verification v = repo.findById(id).orElseThrow();
        VerificationStatus s = VerificationStatus.valueOf(r.status());
        User admin = user(authentication.getName());
        v.setStatus(s);
        v.setAdminRemarks(r.remarks());
        v.setReviewedBy(admin);
        v.setReviewedAt(java.time.Instant.now());
        v.getStudent().setVerificationStatus(s);
        users.save(v.getStudent());

        Notification n = new Notification();
        n.setRecipient(v.getStudent());
        n.setType(NotificationType.VERIFICATION);
        n.setMessage("Verification " + s.name().toLowerCase());
        notifications.save(n);
        return repo.save(v);
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow();
    }
}
