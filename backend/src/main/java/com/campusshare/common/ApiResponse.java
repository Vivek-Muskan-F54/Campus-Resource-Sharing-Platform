package com.campusshare.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

/**
 * Standard envelope for every API response.
 *
 * Success:  { "success": true,  "message": "...", "data": { … } }
 * Error:    { "success": false, "message": "...", "errors": [ … ] }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        List<FieldError> errors,
        Instant timestamp
) {

    // ── factories ────────────────────────────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "Success", data, null, Instant.now());
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null, Instant.now());
    }

    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, message, null, null, Instant.now());
    }

    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, message, null, null, Instant.now());
    }

    public static ApiResponse<Void> validationError(String message, List<FieldError> fieldErrors) {
        return new ApiResponse<>(false, message, null, fieldErrors, Instant.now());
    }

    // ── ResponseEntity helpers ───────────────────────────────────────────────

    public static <T> ResponseEntity<ApiResponse<T>> okEntity(T data) {
        return ResponseEntity.ok(ok(data));
    }

    public static <T> ResponseEntity<ApiResponse<T>> okEntity(String message, T data) {
        return ResponseEntity.ok(ok(message, data));
    }

    public static <T> ResponseEntity<ApiResponse<T>> createdEntity(T data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ok("Created successfully", data));
    }

    public static ResponseEntity<ApiResponse<Void>> errorEntity(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(error(message));
    }

    // ── nested types ─────────────────────────────────────────────────────────

    public record FieldError(String field, String message) {}
}
