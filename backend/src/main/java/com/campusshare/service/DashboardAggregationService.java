package com.campusshare.service;

import com.campusshare.dto.DashboardDtos.PersonalizedDashboardResponse;
import org.springframework.data.domain.Pageable;

public interface DashboardAggregationService {
    PersonalizedDashboardResponse personalized(String email, Pageable pageable);
}
