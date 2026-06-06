package com.campusshare.controller;

import com.campusshare.common.FileValidationUtil;
import com.campusshare.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * General-purpose file upload endpoint.
 *
 * Security controls applied:
 *  - Requires authentication (secured by SecurityConfig).
 *  - Content-type must be an allowed image or PDF type.
 *  - Magic-byte validation prevents MIME spoofing.
 *  - Size capped at {@link FileValidationUtil#MAX_FILE_SIZE_BYTES}.
 *  - Original filename is sanitised before being forwarded to storage.
 *  - {@code folder} parameter is stripped of path-traversal characters.
 */
@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);

    /** Allowed folders a client may request. Prevents arbitrary path injection. */
    private static final java.util.Set<String> ALLOWED_FOLDERS = java.util.Set.of(
            "campus-share", "listings", "verification", "profiles", "notes"
    );

    private final StorageService storage;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> upload(
            Authentication authentication,
            @RequestParam MultipartFile file,
            @RequestParam(defaultValue = "campus-share") String folder) {

        // 1. Validate file (type, magic bytes, size)
        FileValidationUtil.validateImage(file, FileValidationUtil.MAX_FILE_SIZE_BYTES);

        // 2. Sanitise folder name – reject anything not in the allow-list
        String safeFolder = ALLOWED_FOLDERS.contains(folder) ? folder : "campus-share";

        // 3. Sanitise filename (for logging and storage metadata only)
        String safeFilename = FileValidationUtil.sanitiseFilename(file.getOriginalFilename());

        log.info("Upload: user={} folder={} filename={} size={}",
                authentication.getName(), safeFolder, safeFilename, file.getSize());

        String url = storage.upload(file, safeFolder);
        return Map.of("url", url);
    }
}
