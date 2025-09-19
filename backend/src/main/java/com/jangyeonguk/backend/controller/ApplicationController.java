package com.jangyeonguk.backend.controller;

import com.jangyeonguk.backend.dto.application.ApplicationCreateRequestDto;
import com.jangyeonguk.backend.dto.application.ApplicationResponseDto;
import com.jangyeonguk.backend.dto.evaluation.EvaluationResultDto;
import com.jangyeonguk.backend.dto.evaluation.EvaluationResultResponseDto;
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
     * 지원서의 자기소개서 문항 데이터 조회
     */
    @GetMapping("/{applicationId}/cover-letter-questions")
    public ResponseEntity<Map<String, Object>> getCoverLetterQuestions(@PathVariable Long applicationId) {
        try {
            Map<String, Object> response = applicationService.getCoverLetterQuestions(applicationId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * 지원서의 평가 결과 조회
     */
    @GetMapping("/{applicationId}/evaluation-result")
    public ResponseEntity<EvaluationResultDto> getApplicationEvaluationResult(@PathVariable Long applicationId) {
        try {
            EvaluationResultDto response = applicationService.getApplicationEvaluationResult(applicationId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * ApplicationId로 EvaluationResult 조회 (새로운 API)
     */
    @GetMapping("/{applicationId}/evaluation-result-detail")
    public ResponseEntity<EvaluationResultResponseDto> getEvaluationResultByApplicationId(@PathVariable Long applicationId) {
        try {
            EvaluationResultResponseDto response = applicationService.getEvaluationResultByApplicationId(applicationId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(null);
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

    /**
     * 공고별 지원서 통계 조회
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getApplicationStatistics() {
        try {
            Map<String, Object> statistics = applicationService.getApplicationStatisticsByJobPosting();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "통계 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 공고별 평가 기준 조회
     */
    @GetMapping("/job-postings/{jobPostingId}/evaluation-criteria")
    public ResponseEntity<Map<String, Object>> getEvaluationCriteria(@PathVariable Long jobPostingId) {
        try {
            Map<String, Object> criteria = applicationService.getEvaluationCriteria(jobPostingId);
            return ResponseEntity.ok(criteria);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "평가 기준 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 관리자용 임시 평가 결과 처리 (테스트용)
     */
    @PostMapping("/admin/evaluation-result")
    public ResponseEntity<Map<String, Object>> processEvaluationResultForAdmin(@RequestBody EvaluationResultDto evaluationResult) {
        try {
            // 관리자용 로깅
            System.out.println("=== 관리자용 평가 결과 처리 시작 ===");
            System.out.println("지원자: " + evaluationResult.getApplicantName());
            System.out.println("이메일: " + evaluationResult.getApplicantEmail());
            System.out.println("공고 ID: " + evaluationResult.getJobPostingId());
            System.out.println("지원서 ID: " + evaluationResult.getApplicationId());
            
            // 평가 결과 처리
            applicationService.processEvaluationResultForAdmin(evaluationResult);
            
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "관리자용 평가 결과가 성공적으로 처리되었습니다.");
            response.put("applicantName", evaluationResult.getApplicantName());
            response.put("jobPostingId", evaluationResult.getJobPostingId());
            response.put("timestamp", java.time.LocalDateTime.now());
            
            System.out.println("=== 관리자용 평가 결과 처리 완료 ===");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("=== 관리자용 평가 결과 처리 실패 ===");
            System.err.println("오류: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new java.util.HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "관리자용 평가 결과 처리에 실패했습니다: " + e.getMessage());
            errorResponse.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}