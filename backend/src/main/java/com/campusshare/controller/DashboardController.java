package com.campusshare.controller;

import com.campusshare.dto.DashboardDtos.PersonalizedDashboardResponse;
import com.campusshare.service.DashboardAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardAggregationService dashboardAggregationService;

    @GetMapping("/personalized")
    public PersonalizedDashboardResponse personalized(
            Authentication authentication,
            @PageableDefault(size = 6, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return dashboardAggregationService.personalized(authentication.getName(), pageable);
    }
}
