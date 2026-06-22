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
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NoteController.class);
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

    @GetMapping("/{noteId}/preview")
    public ResponseEntity<Resource> preview(@PathVariable Long noteId) {
        NoteResponse note = noteService.getById(noteId);
        log.info("Serving note preview: id={} fileUrl={}", noteId, note.fileUrl());
        return proxyPdf(note.fileUrl(), note.originalFilename(), false);
    }

    @GetMapping("/{noteId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long noteId) {
        NoteResponse note = noteService.recordDownload(noteId);
        log.info("Serving note download: id={} fileUrl={}", noteId, note.fileUrl());
        return proxyPdf(note.fileUrl(), note.originalFilename(), true);
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

    private ResponseEntity<Resource> proxyPdf(String fileUrl, String originalFilename, boolean attachment) {
        try {
            URL url = URI.create(fileUrl).toURL();
            URLConnection connection = url.openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(30_000);

            String contentType = connection.getContentType();
            long contentLength = connection.getContentLengthLong();
            InputStream inputStream = connection.getInputStream();
            InputStreamResource resource = new InputStreamResource(inputStream);

            ContentDisposition disposition = (attachment
                    ? ContentDisposition.attachment()
                    : ContentDisposition.inline())
                    .filename(
                            originalFilename == null || originalFilename.isBlank() ? "note.pdf" : originalFilename,
                            StandardCharsets.UTF_8
                    )
                    .build();

            ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                    .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_PDF);
            if (contentLength >= 0) {
                builder = builder.contentLength(contentLength);
            }
            return builder.body(resource);
        } catch (IOException | IllegalArgumentException ex) {
            throw new RuntimeException("Unable to load note PDF", ex);
        }
    }
}
