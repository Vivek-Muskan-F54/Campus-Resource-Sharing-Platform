package com.campusshare.service;

import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.dto.AdminDtos.AdminUserResponse;
import com.campusshare.dto.AdminDtos.AdminVerificationResponse;
import com.campusshare.dto.AdminDtos.DashboardStatsResponse;
import com.campusshare.dto.AdminDtos.VerificationActionRequest;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.ProductDtos.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminService {
    DashboardStatsResponse dashboard();
    Page<AdminUserResponse> users(Pageable pageable);
    AdminUserResponse blockUser(Long userId);
    AdminUserResponse unblockUser(Long userId);
    Page<AdminVerificationResponse> verifications(VerificationStatus status, Pageable pageable);
    AdminVerificationResponse approveVerification(Long verificationId, String adminEmail, VerificationActionRequest request);
    AdminVerificationResponse rejectVerification(Long verificationId, String adminEmail, VerificationActionRequest request);
    Page<ProductResponse> products(ListingStatus status, Pageable pageable);
    void removeProduct(Long productId);
    Page<NoteResponse> notes(ModerationStatus status, Pageable pageable);
    void removeNote(Long noteId);
}
