package com.campusshare.dto;
import jakarta.validation.constraints.*;
public final class ContentDtos {
 private ContentDtos(){}
 public record VerificationRequest(@NotBlank String idCardUrl){}
 public record ModerationRequest(@NotBlank String status,String remarks){}
 public record NoteRequest(@NotBlank String title,@NotBlank String subject,@Min(1) @Max(12) Integer semester,@NotBlank String fileUrl){}
 public record ChatRequest(@NotNull Long recipientId,Long productId,Long listingId,@NotBlank String content){
  public Long effectiveProductId(){return productId!=null?productId:listingId;}
 }
}
