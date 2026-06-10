package com.campusshare.service.impl;

import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.*;
import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Enums.NotificationType;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.dto.AdminDtos.*;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.ProductDtos.ProductResponse;
import com.campusshare.repository.*;
import com.campusshare.service.AdminService;
import com.campusshare.service.NoteService;
import com.campusshare.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminServiceImpl implements AdminService {
    private static final Logger log = LoggerFactory.getLogger(AdminServiceImpl.class);
    private final UserRepository users;
    private final VerificationRepository verifications;
    private final ProductRepository products;
    private final NoteRepository notes;
    private final OrderRepository orders;
    private final MessageRepository messages;
    private final NotificationRepository notifications;
    private final ProductService productService;
    private final NoteService noteService;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse dashboard() {
        return new DashboardStatsResponse(
                users.count(),
                users.countByEnabledTrue(),
                users.countByEnabledFalse(),
                users.countByVerificationStatus(VerificationStatus.APPROVED),
                verifications.countByStatus(VerificationStatus.PENDING),
                products.count(),
                products.countByStatus(ListingStatus.ACTIVE),
                notes.count(),
                notes.countByStatus(ModerationStatus.APPROVED),
                orders.count(),
                messages.count());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> users(Pageable pageable) {
        return users.findAll(pageable).map(this::toUserResponse);
    }

    @Override
    public AdminUserResponse blockUser(Long userId) {
        User user = findUser(userId);
        user.setEnabled(false);
        return toUserResponse(users.save(user));
    }

    @Override
    public AdminUserResponse unblockUser(Long userId) {
        User user = findUser(userId);
        user.setEnabled(true);
        return toUserResponse(users.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminVerificationResponse> verifications(VerificationStatus status, Pageable pageable) {
        VerificationStatus filter = status == null ? VerificationStatus.PENDING : status;
        return verifications.findByStatus(filter, pageable).map(this::toVerificationResponse);
    }

    @Override
    public AdminVerificationResponse approveVerification(Long verificationId, String adminEmail, VerificationActionRequest request) {
        return changeVerification(verificationId, adminEmail, VerificationStatus.APPROVED, request.remarks());
    }

    @Override
    public AdminVerificationResponse rejectVerification(Long verificationId, String adminEmail, VerificationActionRequest request) {
        return changeVerification(verificationId, adminEmail, VerificationStatus.REJECTED, request.remarks());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> products(ListingStatus status, Pageable pageable) {
        ListingStatus filter = status == null ? ListingStatus.ACTIVE : status;
        return productService.search(null, null, null, null, null, null, filter, pageable);
    }

    @Override
    public void removeProduct(Long productId) {
        Product product = products.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        product.setStatus(ListingStatus.DELETED);
        products.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NoteResponse> notes(ModerationStatus status, Pageable pageable) {
        ModerationStatus filter = status == null ? ModerationStatus.PENDING : status;
        return noteService.adminSearch(null, null, null, null, filter, pageable);
    }

    @Override
    public void removeNote(Long noteId) {
        Note note = notes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        note.setStatus(ModerationStatus.REJECTED);
        note.setModerationRemarks("Removed by admin");
        notes.save(note);
    }

    private AdminUserResponse toUserResponse(User user) {
        Set<String> roleNames = user.getRoles().stream().map(Enum::name).collect(java.util.stream.Collectors.toSet());
        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCollegeRollNumber(),
                user.isEnabled(),
                roleNames,
                user.getVerificationStatus(),
                user.getAverageRating(),
                user.getRatingCount());
    }

    private AdminVerificationResponse toVerificationResponse(Verification verification) {
        return new AdminVerificationResponse(
                verification.getId(),
                verification.getStudent().getId(),
                verification.getStudent().getName(),
                verification.getStudent().getEmail(),
                verification.getIdCardUrl(),
                verification.getStatus(),
                verification.getAdminRemarks(),
                verification.getReviewedAt(),
                verification.getReviewedBy() == null ? null : verification.getReviewedBy().getName());
    }

    private AdminVerificationResponse changeVerification(
            Long verificationId,
            String adminEmail,
            VerificationStatus status,
            String remarks) {
        Verification verification = verifications.findById(verificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Verification not found"));
        User admin = users.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found"));

        verification.setStatus(status);
        verification.setAdminRemarks(remarks);
        verification.setReviewedBy(admin);
        verification.setReviewedAt(Instant.now());
        verification.getStudent().setVerificationStatus(status);
        users.save(verification.getStudent());

        Notification notification = new Notification();
        notification.setRecipient(verification.getStudent());
        notification.setType(NotificationType.VERIFICATION);
        notification.setMessage("Your ID card verification was " + status.name().toLowerCase());
        notification.setLink("/verification");
        notifications.save(notification);

        if (status == VerificationStatus.APPROVED) {
            log.info("event=verification_approved verification_id={} student_id={} admin_id={}",
                    verificationId, verification.getStudent().getId(), admin.getId());
        } else if (status == VerificationStatus.REJECTED) {
            log.info("event=verification_rejected verification_id={} student_id={} admin_id={}",
                    verificationId, verification.getStudent().getId(), admin.getId());
        }
        return toVerificationResponse(verifications.save(verification));
    }

    private User findUser(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
