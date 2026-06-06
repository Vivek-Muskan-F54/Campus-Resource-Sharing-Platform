package com.campusshare.domain;

public final class Enums {
    private Enums() {}
    public enum Role { ADMIN, STUDENT }
    public enum VerificationStatus { PENDING, APPROVED, REJECTED }
    public enum ListingType { SELL, RENT, EXCHANGE }
    public enum ItemCondition { NEW, LIKE_NEW, GOOD, FAIR, POOR }
    public enum ListingStatus { ACTIVE, RESERVED, COMPLETED, REJECTED, DELETED }
    public enum OrderStatus { REQUESTED, APPROVED, REJECTED, READY_FOR_HANDOVER, COMPLETED, CANCELLED }
    public enum ModerationStatus { PENDING, APPROVED, REJECTED }
    public enum NotificationType { MESSAGE, ORDER, VERIFICATION, SYSTEM }
}
