package com.campusshare.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.List;

/**
 * Centralized exception handler.
 * Returns the standard {@link ApiResponse} envelope for every error.
 *
 * IMPORTANT: never log raw exception messages that might contain
 * passwords, tokens, or PII. Log only safe structural information.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── Business / domain errors ─────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> notFound(ResourceNotFoundException ex) {
        log.debug("Resource not found: {}", ex.getMessage());
        return ApiResponse.errorEntity(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> badRequest(BadRequestException ex) {
        log.debug("Bad request: {}", ex.getMessage());
        return ApiResponse.errorEntity(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> illegalArgument(IllegalArgumentException ex) {
        log.debug("Illegal argument: {}", ex.getMessage());
        return ApiResponse.errorEntity(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // ── Auth errors ──────────────────────────────────────────────────────────

    @ExceptionHandler({ BadCredentialsException.class, DisabledException.class })
    public ResponseEntity<ApiResponse<Void>> authError(RuntimeException ex) {
        // Generic message intentionally hides whether the email or password was wrong
        log.warn("Authentication failure: {}", ex.getClass().getSimpleName());
        return ApiResponse.errorEntity(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ApiResponse<Void>> tokenRefresh(TokenRefreshException ex) {
        log.warn("Token refresh failure: {}", ex.getMessage());
        return ApiResponse.errorEntity(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> accessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ApiResponse.errorEntity(
                HttpStatus.FORBIDDEN, "You do not have permission to access this resource");
    }

    // ── Validation errors ────────────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> validationError(MethodArgumentNotValidException ex) {
        List<ApiResponse.FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> new ApiResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();

        log.debug("Validation failed on {} field(s)", fieldErrors.size());
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.validationError("Validation failed", fieldErrors));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> missingParam(MissingServletRequestParameterException ex) {
        return ApiResponse.errorEntity(HttpStatus.BAD_REQUEST,
                "Required parameter '" + ex.getParameterName() + "' is missing");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> typeMismatch(MethodArgumentTypeMismatchException ex) {
        return ApiResponse.errorEntity(HttpStatus.BAD_REQUEST,
                "Invalid value for parameter '" + ex.getName() + "'");
    }

    // ── File upload errors ───────────────────────────────────────────────────

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> uploadTooLarge(MaxUploadSizeExceededException ex) {
        log.debug("Upload size exceeded");
        return ApiResponse.errorEntity(HttpStatus.PAYLOAD_TOO_LARGE,
                "File size exceeds the maximum allowed limit of 20 MB");
    }

    // ── Catch-all ────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unexpected(Exception ex) {
        // Log full stack trace at ERROR level – safe because we return a generic message
        log.error("Unexpected error [{}]", ex.getClass().getSimpleName(), ex);
        return ApiResponse.errorEntity(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
