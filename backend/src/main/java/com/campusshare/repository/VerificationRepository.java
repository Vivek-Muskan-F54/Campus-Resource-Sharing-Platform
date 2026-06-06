package com.campusshare.repository;
import com.campusshare.domain.Verification;
import com.campusshare.domain.Enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerificationRepository extends JpaRepository<Verification,Long> {
    Optional<Verification> findByStudentId(Long id);
    Page<Verification> findByStatus(VerificationStatus status, Pageable pageable);
    long countByStatus(VerificationStatus status);
}
