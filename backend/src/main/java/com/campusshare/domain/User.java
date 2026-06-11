package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;
import static com.campusshare.domain.Enums.*;

@Getter @Setter @NoArgsConstructor @Entity @Table(name = "users")
public class User extends BaseEntity {
    @Column(nullable=false, length=100) private String name;
    @Column(nullable=false, unique=true, length=150) private String email;
    @Column(nullable=false) private String password;
    @Column(nullable=false, length=30) private String collegeRollNumber;
    @Column(nullable=false) private boolean enabled = true;
    @Column private Boolean emailVerified;
    @Column(nullable=false) private double averageRating = 0;
    @Column(nullable=false) private int ratingCount = 0;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private VerificationStatus verificationStatus = VerificationStatus.PENDING;
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name="user_roles", joinColumns=@JoinColumn(name="user_id"))
    @Enumerated(EnumType.STRING) @Column(name="role", nullable=false)
    private Set<Role> roles = new HashSet<>(Set.of(Role.STUDENT));
}
