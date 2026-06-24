package com.campusshare.domain;

public final class Enums {
    private Enums() {}
    public enum Role { ADMIN, STUDENT }
    public enum VerificationStatus { PENDING, APPROVED, REJECTED }
    public enum AuthTokenPurpose { EMAIL_VERIFICATION, PASSWORD_RESET }
    public enum ListingType { SELL, RENT, EXCHANGE }
    public enum ItemCondition { NEW, LIKE_NEW, GOOD, FAIR, POOR }
    public enum ListingStatus { ACTIVE, RESERVED, COMPLETED, REJECTED, DELETED }
    public enum OrderStatus { REQUESTED, APPROVED, REJECTED, READY_FOR_HANDOVER, COMPLETED, CANCELLED }
    public enum ModerationStatus { PENDING, APPROVED, REJECTED }
    public enum NotificationType { MESSAGE, ORDER, VERIFICATION, SYSTEM }
    public enum ActivityType {
        LOGIN,
        VIEW_NOTE,
        DOWNLOAD_NOTE,
        BOOKMARK_NOTE,
        RATE_NOTE,
        UPLOAD_NOTE,
        VIEW_PRODUCT,
        WISHLIST_PRODUCT,
        ORDER_PRODUCT,
        SEARCH,
        CHAT_SENT
    }
    public enum ActivityEntityType { NOTE, PRODUCT, USER, CHAT, SYSTEM }
}
