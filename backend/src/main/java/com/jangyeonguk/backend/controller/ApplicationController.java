package com.jangyeonguk.backend.controller;

import com.jangyeonguk.backend.dto.application.ApplicationCreateRequestDto;
import com.jangyeonguk.backend.dto.application.ApplicationResponseDto;
import com.jangyeonguk.backend.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 지원서 Controller
 */
@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    /**
     * 지원서 제출
     */
    @PostMapping("/job-postings/{jobPostingId}")
    public ResponseEntity<ApplicationResponseDto> submitApplication(
            @PathVariable Long jobPostingId,
            @RequestBody ApplicationCreateRequestDto request) {
        ApplicationResponseDto response = applicationService.submitApplication(jobPostingId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 지원서 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<ApplicationResponseDto>> getApplications() {
        List<ApplicationResponseDto> response = applicationService.getApplications();
        return ResponseEntity.ok(response);
    }

    /**
     * 공고별 지원서 조회
     */
    @GetMapping("/job-postings/{jobPostingId}")
    public ResponseEntity<List<ApplicationResponseDto>> getApplicationsByJobPosting(@PathVariable Long jobPostingId) {
        List<ApplicationResponseDto> response = applicationService.getApplicationsByJobPosting(jobPostingId);
        return ResponseEntity.ok(response);
    }
}