package com.campusshare.service;

import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.dto.NoteDtos.NoteCreateRequest;
import com.campusshare.dto.NoteDtos.NoteModerationRequest;
import com.campusshare.dto.NoteDtos.NoteResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface NoteService {
    Page<NoteResponse> search(String query, String branch, Integer semester, String subject, Pageable pageable);
    default Page<NoteResponse> search(String viewerEmail, String query, String branch, Integer semester, String subject, Pageable pageable) {
        return search(query, branch, semester, subject, pageable);
    }

    Page<NoteResponse> adminSearch(String query, String branch, Integer semester, String subject, ModerationStatus status, Pageable pageable);

    NoteResponse getById(Long noteId);

    NoteResponse getAnyById(Long noteId);

    NoteResponse preview(Long noteId, String viewerEmail, boolean isAdmin);

    NoteResponse uploadPdf(String email, NoteCreateRequest request, MultipartFile file);

    NoteResponse createFromExistingFileUrl(String email, NoteCreateRequest request);

    NoteResponse recordDownload(Long noteId);

    String getDownloadUrlAndRecord(Long noteId);

    NoteResponse moderate(Long noteId, NoteModerationRequest request);
}
