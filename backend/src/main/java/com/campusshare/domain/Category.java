package com.campusshare.domain;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @Entity
public class Category extends BaseEntity {
    @Column(nullable=false, unique=true, length=80) private String name;
    private String description;
}
