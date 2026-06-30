package com.campusshare.repository;
import com.campusshare.domain.User;
import com.campusshare.domain.Enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByEnabledTrue();
    long countByEnabledFalse();
    long countByVerificationStatus(VerificationStatus status);
}
