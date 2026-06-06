package com.campusshare.service.impl;
import com.campusshare.common.*;
import com.campusshare.domain.*;
import com.campusshare.domain.Enums.*;
import com.campusshare.repository.*;
import com.campusshare.service.OrderService;
import com.campusshare.service.QrGenerationService;
import com.campusshare.service.QrVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
@Service @RequiredArgsConstructor @Transactional
public class OrderServiceImpl implements OrderService {
 private final OrderRepository orders; private final ProductRepository products; private final UserRepository users; private final NotificationRepository notifications; private final QrGenerationService qrGenerationService; private final QrVerificationService qrVerificationService;
 public MarketplaceOrder request(String email,Long productId){User buyer=user(email);Product p=products.findById(productId).orElseThrow(()->new ResourceNotFoundException("Product not found"));if(p.getSeller().getId().equals(buyer.getId()))throw new BadRequestException("Cannot request your own product");MarketplaceOrder o=new MarketplaceOrder();o.setProduct(p);o.setBuyer(buyer);o.setSeller(p.getSeller());notify(p.getSeller(),NotificationType.ORDER,"New order request for "+p.getTitle(),"/orders");return orders.save(o);}
 public MarketplaceOrder status(String email,Long id,String status){MarketplaceOrder o=get(id);OrderStatus next=OrderStatus.valueOf(status);if(!o.getSeller().getEmail().equals(email)&&!o.getBuyer().getEmail().equals(email))throw new BadRequestException("Not part of this order");if(o.getStatus()==OrderStatus.COMPLETED)throw new BadRequestException("Completed orders cannot be changed");if(next==OrderStatus.COMPLETED)throw new BadRequestException("Use QR verification to complete the order");if(next==OrderStatus.APPROVED&&o.getStatus()!=OrderStatus.REQUESTED)throw new BadRequestException("Only requested orders can be approved");if(next==OrderStatus.READY_FOR_HANDOVER&&o.getStatus()!=OrderStatus.APPROVED)throw new BadRequestException("Only approved orders can move to handover");o.setStatus(next);if(next==OrderStatus.READY_FOR_HANDOVER){String token=qrGenerationService.issueToken(o);o.setHandoverTokenHash(qrGenerationService.sha256(token));}notify(o.getBuyer(),NotificationType.ORDER,"Order status changed to "+next,"/orders");return orders.save(o);}
 @Transactional(readOnly=true) public Page<MarketplaceOrder> mine(String email,Pageable p){User u=user(email);return orders.findByBuyerIdOrSellerId(u.getId(),u.getId(),p);}
 public MarketplaceOrder verifyHandover(String email,String token){return qrVerificationService.verify(email,token);}
 private MarketplaceOrder get(Long id){return orders.findById(id).orElseThrow(()->new ResourceNotFoundException("Order not found"));}
 private User user(String e){return users.findByEmail(e).orElseThrow(()->new ResourceNotFoundException("User not found"));}
 private void notify(User u,NotificationType t,String m,String link){Notification n=new Notification();n.setRecipient(u);n.setType(t);n.setMessage(m);n.setLink(link);notifications.save(n);}
}
