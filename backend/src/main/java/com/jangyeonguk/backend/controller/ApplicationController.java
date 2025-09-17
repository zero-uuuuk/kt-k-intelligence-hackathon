package com.jangyeonguk.backend.controller;

import com.jangyeonguk.backend.dto.application.ApplicationCreateRequestDto;
import com.jangyeonguk.backend.dto.application.ApplicationResponseDto;
import com.jangyeonguk.backend.dto.evaluation.EvaluationResultDto;
import com.jangyeonguk.backend.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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


    /**
     * 평가 결과 처리
     */
    @PostMapping("/evaluation-result")
    public ResponseEntity<String> processEvaluationResult(@RequestBody com.jangyeonguk.backend.dto.evaluation.EvaluationResultDto evaluationResult) {
        try {
            applicationService.processEvaluationResult(evaluationResult);
            return ResponseEntity.ok("평가 결과가 성공적으로 처리되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("평가 결과 처리에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 지원서 ID로 지원자 정보와 답변 조회
     */
    @GetMapping("/{applicationId}/details")
    public ResponseEntity<Map<String, Object>> getApplicationDetails(@PathVariable Long applicationId) {
        try {
            Map<String, Object> response = applicationService.getApplicationDetails(applicationId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * 지원서 평가 의견 및 상태 저장
     */
    @PutMapping("/{applicationId}/evaluation")
    public ResponseEntity<String> saveEvaluation(
            @PathVariable Long applicationId,
            @RequestBody Map<String, Object> evaluationData) {
        try {
            String comment = (String) evaluationData.get("comment");
            String status = (String) evaluationData.get("status");

            applicationService.saveEvaluation(applicationId, comment, status);
            return ResponseEntity.ok("평가가 성공적으로 저장되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("평가 저장에 실패했습니다: " + e.getMessage());
        }
    }
}