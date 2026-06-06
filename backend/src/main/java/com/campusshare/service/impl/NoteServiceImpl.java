package com.campusshare.service.impl;

import com.campusshare.common.BadRequestException;
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
import com.campusshare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteServiceImpl implements NoteService {
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final NoteRepository notes;
    private final UserRepository users;
    private final StorageService storage;

    @Override
    @Transactional(readOnly = true)
    public Page<NoteResponse> search(String query, String branch, Integer semester, String subject, Pageable pageable) {
        return notes.search(blank(query), blank(branch), semester, blank(subject), ModerationStatus.APPROVED, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NoteResponse> adminSearch(String query, String branch, Integer semester, String subject, ModerationStatus status, Pageable pageable) {
        return notes.search(blank(query), blank(branch), semester, blank(subject), status, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse getById(Long noteId) {
        Note note = findApprovedNote(noteId);
        return toResponse(note);
    }

    @Override
    public NoteResponse uploadPdf(String email, NoteCreateRequest request, MultipartFile file) {
        validatePdf(file);
        StorageUploadResult uploaded = storage.upload(file, "campus-share/notes", "auto");

        Note note = buildBaseNote(email, request);
        note.setFileUrl(uploaded.url());
        note.setPublicId(uploaded.publicId());
        note.setOriginalFilename(file.getOriginalFilename());
        note.setContentType(file.getContentType());
        note.setFileSize(uploaded.bytes() > 0 ? uploaded.bytes() : file.getSize());
        return toResponse(notes.save(note));
    }

    @Override
    public NoteResponse createFromExistingFileUrl(String email, NoteCreateRequest request) {
        if (request.fileUrl() == null || request.fileUrl().isBlank()) {
            throw new BadRequestException("fileUrl is required when creating note metadata");
        }
        Note note = buildBaseNote(email, request);
        note.setFileUrl(request.fileUrl());
        note.setContentType(PDF_CONTENT_TYPE);
        return toResponse(notes.save(note));
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
        note.setStatus(request.status());
        note.setModerationRemarks(request.remarks());
        return toResponse(notes.save(note));
    }

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

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("PDF file is required");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        boolean pdfContentType = PDF_CONTENT_TYPE.equalsIgnoreCase(file.getContentType());
        if (!pdfContentType && !filename.endsWith(".pdf")) {
            throw new BadRequestException("Only PDF notes are allowed");
        }
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
