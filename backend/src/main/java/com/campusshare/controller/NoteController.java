package com.campusshare.controller;

import com.campusshare.domain.Enums.ModerationStatus;
import com.campusshare.dto.NoteDtos.NoteCreateRequest;
import com.campusshare.dto.NoteDtos.NoteModerationRequest;
import com.campusshare.dto.NoteDtos.NoteResponse;
import com.campusshare.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {
    private final NoteService noteService;

    @GetMapping
    public Page<NoteResponse> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String subject,
            @PageableDefault(size = 12, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return noteService.search(q, branch, semester, subject, pageable);
    }

    @GetMapping("/{noteId}")
    public NoteResponse getById(@PathVariable Long noteId) {
        return noteService.getById(noteId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse uploadPdf(
            Authentication authentication,
            @Valid @ModelAttribute NoteCreateRequest request,
            @RequestPart("file") MultipartFile file) {
        return noteService.uploadPdf(authentication.getName(), request, file);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse createMetadata(
            Authentication authentication,
            @Valid @RequestBody NoteCreateRequest request) {
        return noteService.createFromExistingFileUrl(authentication.getName(), request);
    }

    @GetMapping("/{noteId}/download")
    public ResponseEntity<Void> download(@PathVariable Long noteId) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(noteService.getDownloadUrlAndRecord(noteId)))
                .build();
    }

    @PostMapping("/{noteId}/download")
    public NoteResponse recordDownload(@PathVariable Long noteId) {
        return noteService.recordDownload(noteId);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<NoteResponse> adminSearch(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) ModerationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return noteService.adminSearch(q, branch, semester, subject, status, pageable);
    }

    @PatchMapping("/{noteId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public NoteResponse moderate(
            @PathVariable Long noteId,
            @Valid @RequestBody NoteModerationRequest request) {
        return noteService.moderate(noteId, request);
    }
}
