package com.campusshare.repository;
import com.campusshare.domain.Notification;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<Notification,Long> { Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long id,Pageable pageable); long countByRecipientIdAndReadFlagFalse(Long id); }
