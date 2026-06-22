package com.campusshare.controller;

import com.campusshare.domain.Enums.ListingStatus;
import com.campusshare.domain.Enums.VerificationStatus;
import com.campusshare.dto.AdminDtos.*;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.ProductDtos.ProductResponse;
import com.campusshare.service.AdminService;
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
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/dashboard")
    public DashboardStatsResponse dashboard() {
        return adminService.dashboard();
    }

    @GetMapping("/users")
    public Page<AdminUserResponse> users(@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return adminService.users(pageable);
    }

    @PatchMapping("/users/{id}/block")
    public AdminUserResponse block(@PathVariable Long id) {
        return adminService.blockUser(id);
    }

    @PatchMapping("/users/{id}/unblock")
    public AdminUserResponse unblock(@PathVariable Long id) {
        return adminService.unblockUser(id);
    }

    @GetMapping("/verifications")
    public Page<AdminVerificationResponse> verifications(
            @RequestParam(required = false) VerificationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return adminService.verifications(status, pageable);
    }

    @PatchMapping("/verifications/{id}/approve")
    public AdminVerificationResponse approve(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody VerificationActionRequest request) {
        return adminService.approveVerification(id, authentication.getName(), request);
    }

    @PatchMapping("/verifications/{id}/reject")
    public AdminVerificationResponse reject(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody VerificationActionRequest request) {
        return adminService.rejectVerification(id, authentication.getName(), request);
    }

    @GetMapping("/products")
    public Page<ProductResponse> products(
            @RequestParam(required = false) ListingStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return adminService.products(status, pageable);
    }

    @DeleteMapping("/products/{id}")
    public void removeProduct(@PathVariable Long id) {
        adminService.removeProduct(id);
    }

    @GetMapping("/notes")
    public Page<NoteResponse> notes(
            @RequestParam(required = false) com.campusshare.domain.Enums.ModerationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return adminService.notes(status, pageable);
    }

    @PostMapping("/notes/{id}/approve")
    public NoteResponse approveNote(@PathVariable Long id) {
        return adminService.approveNote(id);
    }

    @DeleteMapping("/notes/{id}")
    public void removeNote(@PathVariable Long id) {
        adminService.removeNote(id);
    }
}
