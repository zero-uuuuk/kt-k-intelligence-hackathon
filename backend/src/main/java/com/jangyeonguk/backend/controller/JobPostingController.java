package com.jangyeonguk.backend.controller;

import com.jangyeonguk.backend.dto.jobposting.JobPostingCreateRequestDto;
import com.jangyeonguk.backend.dto.jobposting.JobPostingResponseDto;
import com.jangyeonguk.backend.service.JobPostingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 채용공고 Controller
 */
@RestController
@RequestMapping("/api/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingService jobPostingService;

    /**
     * 채용공고 등록
     */
    @PostMapping
    public ResponseEntity<JobPostingResponseDto> createJobPosting(@RequestBody JobPostingCreateRequestDto request) {
        JobPostingResponseDto response = jobPostingService.createJobPosting(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 채용공고 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobPostingResponseDto> getJobPosting(@PathVariable Long id) {
        JobPostingResponseDto response = jobPostingService.getJobPosting(id);
        return ResponseEntity.ok(response);
    }

    /**
     * 채용공고 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<JobPostingResponseDto>> getJobPostings() {
        List<JobPostingResponseDto> response = jobPostingService.getJobPostings();
        return ResponseEntity.ok(response);
    }

    /**
     * 공개 채용공고 조회 (지원자용)
     */
    @GetMapping("/public/{id}")
    public ResponseEntity<JobPostingResponseDto> getPublicJobPosting(@PathVariable Long id) {
        JobPostingResponseDto response = jobPostingService.getJobPosting(id);
        return ResponseEntity.ok(response);
    }

    /**
     * 채용공고 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponseDto> updateJobPosting(
            @PathVariable Long id,
            @RequestBody JobPostingCreateRequestDto request) {
        JobPostingResponseDto response = jobPostingService.updateJobPosting(id, request);
        return ResponseEntity.ok(response);
    }

}