package com.campusshare.controller;
import com.campusshare.domain.Notification;
import com.campusshare.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {
 private final NotificationRepository repo; private final UserRepository users;
 @GetMapping public Page<Notification> all(Authentication a,Pageable p){return repo.findByRecipientIdOrderByCreatedAtDesc(id(a),p);}
 @GetMapping("/unread-count") public Map<String,Long> count(Authentication a){return Map.of("count",repo.countByRecipientIdAndReadFlagFalse(id(a)));}
 @PatchMapping("/{id}/read") public Notification read(Authentication a,@PathVariable Long id){Notification n=repo.findById(id).orElseThrow();if(!n.getRecipient().getId().equals(id(a)))throw new IllegalArgumentException("Not your notification");n.setReadFlag(true);return repo.save(n);}
 private Long id(Authentication a){return users.findByEmail(a.getName()).orElseThrow().getId();}
}
