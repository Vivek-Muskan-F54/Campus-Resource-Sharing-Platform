package com.campusshare.dto;

public record StorageUploadResult(
        String url,
        String publicId,
        String resourceType,
        long bytes,
        String format) {
}
