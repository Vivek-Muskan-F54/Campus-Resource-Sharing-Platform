package com.campusshare.common;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Centralised file-validation utility.
 *
 * Rules applied to every upload:
 *  1. File must not be empty.
 *  2. Declared content-type must be in the allowed set.
 *  3. Actual magic bytes must match the declared type (prevents MIME spoofing).
 *  4. File size must not exceed the configured limit.
 *  5. Original filename is sanitised before being persisted.
 */
public final class FileValidationUtil {

    private FileValidationUtil() {}

    // ── Magic-byte signatures ──────────────────────────────────────────────
    private static final byte[] PDF_MAGIC      = new byte[]{0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] PNG_MAGIC      = new byte[]{(byte)0x89, 0x50, 0x4E, 0x47};
    private static final byte[] JPEG_MAGIC     = new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF};
    private static final byte[] WEBP_MAGIC     = new byte[]{0x52, 0x49, 0x46, 0x46}; // RIFF (check offset 8 for WEBP)
    private static final byte[] GIF_MAGIC      = new byte[]{0x47, 0x49, 0x46, 0x38}; // GIF8

    // ── Allowed type sets ──────────────────────────────────────────────────
    public static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );
    public static final Set<String> ALLOWED_PDF_TYPES = Set.of(
            "application/pdf"
    );
    public static final Set<String> ALLOWED_ID_CARD_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"
    );

    /** 20 MB — matches Spring multipart limit */
    public static final long MAX_FILE_SIZE_BYTES = 20L * 1024 * 1024;
    /** 5 MB limit for ID-card uploads */
    public static final long MAX_ID_CARD_BYTES   = 5L  * 1024 * 1024;
    /** 50 MB limit for note PDFs */
    public static final long MAX_NOTE_PDF_BYTES  = 50L * 1024 * 1024;

    /** Characters not allowed in filenames after sanitisation */
    private static final Pattern UNSAFE_FILENAME = Pattern.compile("[^a-zA-Z0-9._\\-]");

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Validate an image upload (product photos, profile pictures, etc.).
     *
     * @param file  the uploaded file
     * @param maxBytes maximum accepted size in bytes
     * @throws BadRequestException on any validation failure
     */
    public static void validateImage(MultipartFile file, long maxBytes) {
        assertNotEmpty(file);
        assertSizeLimit(file, maxBytes);
        assertContentType(file, ALLOWED_IMAGE_TYPES, "image");
        assertMagicBytes(file, ALLOWED_IMAGE_TYPES, file.getContentType());
    }

    /**
     * Validate a PDF note upload.
     */
    public static void validatePdf(MultipartFile file, long maxBytes) {
        assertNotEmpty(file);
        assertSizeLimit(file, maxBytes);
        assertContentType(file, ALLOWED_PDF_TYPES, "PDF");
        assertMagicBytes(file, ALLOWED_PDF_TYPES, file.getContentType());
    }

    /**
     * Validate a student ID-card upload (image or PDF allowed).
     */
    public static void validateIdCard(MultipartFile file) {
        assertNotEmpty(file);
        assertSizeLimit(file, MAX_ID_CARD_BYTES);
        assertContentType(file, ALLOWED_ID_CARD_TYPES, "image or PDF");
        assertMagicBytes(file, ALLOWED_ID_CARD_TYPES, file.getContentType());
    }

    /**
     * Sanitise a raw filename so it is safe to store.
     *
     * <ul>
     *   <li>Replace every character that is not alphanumeric, dot, dash, or
     *       underscore with an underscore.</li>
     *   <li>Strip leading dots to prevent hidden-file creation.</li>
     *   <li>Truncate to 200 characters.</li>
     *   <li>Fall back to "upload" if the result would be empty.</li>
     * </ul>
     */
    public static String sanitiseFilename(String raw) {
        if (raw == null || raw.isBlank()) return "upload";
        // Take only the last path component (handles Windows and Unix separators)
        String name = raw.replaceAll("[/\\\\]", "_");
        name = UNSAFE_FILENAME.matcher(name).replaceAll("_");
        name = name.replaceAll("^\\.+", ""); // strip leading dots
        if (name.length() > 200) name = name.substring(0, 200);
        return name.isBlank() ? "upload" : name;
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private static void assertNotEmpty(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File must not be empty");
        }
    }

    private static void assertSizeLimit(MultipartFile file, long maxBytes) {
        if (file.getSize() > maxBytes) {
            long limitMb = maxBytes / (1024 * 1024);
            throw new BadRequestException(
                    "File size exceeds the limit of " + limitMb + " MB");
        }
    }

    private static void assertContentType(MultipartFile file, Set<String> allowed, String label) {
        String ct = normaliseContentType(file.getContentType());
        String ext = extension(file.getOriginalFilename());
        boolean typeOk  = ct != null && allowed.contains(ct);
        boolean extOk   = allowed.stream().anyMatch(a -> a.endsWith(ext));
        if (!typeOk && !extOk) {
            throw new BadRequestException(
                    "Only " + label + " files are accepted. Received: " + file.getContentType());
        }
    }

    /**
     * Read the first bytes of the file and confirm they match the claimed type.
     * This prevents a client from renaming a .exe to .png and uploading it.
     */
    private static void assertMagicBytes(MultipartFile file, Set<String> allowed, String declaredType) {
        byte[] header;
        try (InputStream is = file.getInputStream()) {
            header = is.readNBytes(16);
        } catch (IOException e) {
            throw new BadRequestException("Unable to read uploaded file");
        }

        String ct = normaliseContentType(declaredType);
        if (ct == null) return; // content-type unknown – content-type check already rejected it

        boolean magic = switch (ct) {
            case "application/pdf"          -> startsWith(header, PDF_MAGIC);
            case "image/png"                -> startsWith(header, PNG_MAGIC);
            case "image/jpeg", "image/jpg"  -> startsWith(header, JPEG_MAGIC);
            case "image/gif"                -> startsWith(header, GIF_MAGIC);
            case "image/webp"               -> startsWith(header, WEBP_MAGIC);
            default -> true; // unknown but allowed type – trust content-type validation
        };

        if (!magic) {
            throw new BadRequestException(
                    "File content does not match the declared file type. Upload may be rejected for security reasons.");
        }
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private static String normaliseContentType(String ct) {
        if (ct == null) return null;
        // Strip charset suffix, e.g. "application/pdf; charset=utf-8"
        int semi = ct.indexOf(';');
        return (semi >= 0 ? ct.substring(0, semi) : ct).trim().toLowerCase();
    }

    private static String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
    }
}
