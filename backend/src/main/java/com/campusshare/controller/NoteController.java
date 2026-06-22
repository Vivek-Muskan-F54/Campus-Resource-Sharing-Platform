package com.campusshare.controller;

import com.campusshare.common.BadRequestException;
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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.Resource;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NoteController.class);
    private static final RestTemplate REST_TEMPLATE = new RestTemplate();
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
        log.info("Preview requested for note {}", noteId);
        NoteResponse note = noteService.getById(noteId);
        log.info("Serving note preview: id={} fileUrl={}", noteId, note.fileUrl());
        return proxyPdf(note.fileUrl(), note.originalFilename(), false);
    }

    @GetMapping("/{noteId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long noteId) {
        log.info("Download requested for note {}", noteId);
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
        if (fileUrl == null || fileUrl.isBlank()) {
            log.warn("Note PDF is missing fileUrl");
            throw new BadRequestException("Stored note PDF URL is missing");
        }

        try {
            URI uri = URI.create(fileUrl);
            log.info("Fetching Cloudinary PDF from {}", uri);

            ResponseEntity<byte[]> response = REST_TEMPLATE.exchange(
                    uri,
                    HttpMethod.GET,
                    new HttpEntity<>(createPdfHeaders()),
                    byte[].class
            );

            byte[] body = response.getBody();
            if (body == null || body.length == 0) {
                log.warn("Cloudinary returned an empty PDF body for {}", uri);
                throw new BadRequestException("Cloudinary returned an empty PDF");
            }

            MediaType contentType = response.getHeaders().getContentType();
            if (contentType == null) {
                contentType = MediaType.APPLICATION_PDF;
            }

            ContentDisposition disposition = (attachment
                    ? ContentDisposition.attachment()
                    : ContentDisposition.inline())
                    .filename(
                            originalFilename == null || originalFilename.isBlank() ? "note.pdf" : originalFilename,
                            StandardCharsets.UTF_8
                    )
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(contentType);
            headers.setContentLength(body.length);
            headers.setContentDisposition(disposition);

            log.info("Cloudinary PDF fetched successfully for note fileUrl={} contentType={} bytes={}",
                    fileUrl, contentType, body.length);
            return ResponseEntity.ok().headers(headers).body(new ByteArrayResource(body));
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid note PDF URL: {}", fileUrl);
            throw new BadRequestException("Stored note PDF URL is invalid");
        } catch (HttpStatusCodeException ex) {
            log.warn("Cloudinary returned HTTP {} for note PDF url={}", ex.getStatusCode().value(), fileUrl);
            throw new BadRequestException("Cloudinary returned HTTP " + ex.getStatusCode().value() + " while loading the note PDF");
        } catch (RestClientException ex) {
            log.error("Failed to fetch Cloudinary PDF from url={}", fileUrl, ex);
            throw new BadRequestException("Unable to fetch note PDF from Cloudinary");
        }
    }

    private HttpHeaders createPdfHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_PDF, MediaType.APPLICATION_OCTET_STREAM, MediaType.ALL));
        return headers;
    }
}
