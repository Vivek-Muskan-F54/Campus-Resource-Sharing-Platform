package com.campusshare.dto;
import com.campusshare.domain.Enums.*;
import jakarta.validation.constraints.*;
public final class MarketplaceDtos {
 private MarketplaceDtos(){}
 public record OrderRequest(Long productId,Long listingId){
  @AssertTrue(message="productId is required") public boolean hasProductId(){return productId!=null||listingId!=null;}
  public Long effectiveProductId(){return productId!=null?productId:listingId;}
 }
 public record StatusRequest(@NotBlank String status){}
 public record QrVerifyRequest(@NotBlank String token){}
 public record ReviewRequest(@NotNull Long orderId,@Min(1) @Max(5) int rating,@NotBlank String comment){}
}
