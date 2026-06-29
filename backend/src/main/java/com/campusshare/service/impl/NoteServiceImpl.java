package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
import com.campusshare.common.FileValidationUtil;
import com.campusshare.common.ResourceNotFoundException;
import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.domain.Note;
import com.campusshare.domain.User;
import com.campusshare.dto.NoteDtos.NoteCreateRequest;
import com.campusshare.dto.NoteDtos.NoteModerationRequest;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.dto.StorageUploadResult;
import com.campusshare.repository.NoteRepository;
import com.campusshare.repository.UserRepository;
import com.campusshare.service.NoteService;
import com.campusshare.service.ReputationService;
import com.campusshare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteServiceImpl implements NoteService {

    private static final Logger log = LoggerFactory.getLogger(NoteServiceImpl.class);
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    // 50 MB cap for note PDFs
    private static final long MAX_NOTE_SIZE = 50L * 1024 * 1024;

    private final NoteRepository notes;
    private final UserRepository users;
    private final ReputationService reputationService;
    private final StorageService storage;

    @Override
    @Transactional(readOnly = true)
    public Page<NoteResponse> search(String query, String branch, Integer semester,
                                     String subject, Pageable pageable) {
        return notes.search(blank(query), blank(branch), semester, blank(subject),
                        ModerationStatus.APPROVED, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NoteResponse> adminSearch(String query, String branch, Integer semester,
                                          String subject, ModerationStatus status,
                                          Pageable pageable) {
        return notes.search(blank(query), blank(branch), semester, blank(subject),
                        status, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse getById(Long noteId) {
        return toResponse(findApprovedNote(noteId));
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse getAnyById(Long noteId) {
        Note note = notes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        return toResponse(note);
    }

    @Override
    public NoteResponse uploadPdf(String email, NoteCreateRequest request, MultipartFile file) {
        // Validate: type, magic bytes, size
        FileValidationUtil.validatePdf(file, MAX_NOTE_SIZE);

        String safeFilename = FileValidationUtil.sanitiseFilename(file.getOriginalFilename());
        StorageUploadResult uploaded = storage.upload(file, "campus-share/notes", "raw");

        Note note = buildBaseNote(email, request);
        note.setFileUrl(uploaded.url());
        note.setPublicId(uploaded.publicId());
        note.setOriginalFilename(safeFilename);
        note.setContentType(PDF_CONTENT_TYPE);
        note.setFileSize(uploaded.bytes() > 0 ? uploaded.bytes() : file.getSize());

        Note saved = notes.save(note);
        reputationService.recordNoteUploaded(saved.getUploader());
        log.info("Note uploaded: id={} uploader={} filename={} size={} fileUrl={} publicId={}",
                saved.getId(), email, safeFilename, saved.getFileSize(), saved.getFileUrl(), saved.getPublicId());
        return toResponse(saved);
    }

    @Override
    public NoteResponse createFromExistingFileUrl(String email, NoteCreateRequest request) {
        if (request.fileUrl() == null || request.fileUrl().isBlank()) {
            throw new BadRequestException("fileUrl is required when creating note metadata");
        }
        if (!request.fileUrl().startsWith("https://")) {
            throw new BadRequestException("fileUrl must be a secure HTTPS URL");
        }
        Note note = buildBaseNote(email, request);
        note.setFileUrl(request.fileUrl());
        note.setContentType(PDF_CONTENT_TYPE);

        Note saved = notes.save(note);
        reputationService.recordNoteUploaded(saved.getUploader());
        log.info("Note metadata created: id={} uploader={}", saved.getId(), email);
        return toResponse(saved);
    }

    @Override
    public NoteResponse recordDownload(Long noteId) {
        Note note = findApprovedNote(noteId);
        note.setDownloadCount(note.getDownloadCount() + 1);
        return toResponse(notes.save(note));
    }

    @Override
    public String getDownloadUrlAndRecord(Long noteId) {
        return recordDownload(noteId).fileUrl();
    }

    @Override
    public NoteResponse moderate(Long noteId, NoteModerationRequest request) {
        Note note = notes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        ModerationStatus previousStatus = note.getStatus();
        note.setStatus(request.status());
        note.setModeratedAt(Instant.now());
        note.setModerationRemarks(request.remarks());
        Note saved = notes.save(note);
        if (previousStatus != ModerationStatus.APPROVED && request.status() == ModerationStatus.APPROVED) {
            reputationService.recordNoteApproved(saved.getUploader());
        }
        log.info("Note moderated: id={} status={}", noteId, request.status());
        return toResponse(saved);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Note buildBaseNote(String email, NoteCreateRequest request) {
        User uploader = users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Note note = new Note();
        note.setUploader(uploader);
        note.setTitle(request.title().trim());
        note.setBranch(request.branch().trim());
        note.setSemester(request.semester());
        note.setSubject(request.subject().trim());
        return note;
    }

    private Note findApprovedNote(Long noteId) {
        Note note = notes.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        if (note.getStatus() != ModerationStatus.APPROVED) {
            throw new ResourceNotFoundException("Note not found");
        }
        return note;
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private NoteResponse toResponse(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getBranch(),
                note.getSemester(),
                note.getSubject(),
                note.getFileUrl(),
                note.getOriginalFilename(),
                note.getFileSize(),
                note.getStatus(),
                note.getDownloadCount(),
                note.getUploader().getId(),
                note.getUploader().getName(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
