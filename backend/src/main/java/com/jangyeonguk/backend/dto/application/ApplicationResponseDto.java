package com.jangyeonguk.backend.dto.application;

import com.jangyeonguk.backend.domain.application.Application;
import com.jangyeonguk.backend.domain.application.ApplicationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 지원서 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponseDto {

    private Long id;
    private ApplicationStatus status;
    private String applicantName;
    private String applicantEmail;
    private Long jobPostingId;
    private String jobPostingTitle;
    private String evaluationComment; // 평가 의견 필드 추가
    private Integer passingScore; // 합격기준점수 추가

    public static ApplicationResponseDto from(Application application) {
        return ApplicationResponseDto.builder()
                .id(application.getId())
                .status(application.getStatus())
                .applicantName(application.getApplicant().getName())
                .applicantEmail(application.getApplicant().getEmail())
                .jobPostingId(application.getJobPosting().getId())
                .jobPostingTitle(application.getJobPosting().getTitle())
                .evaluationComment(application.getEvaluationComment()) // 평가 의견 추가
                .passingScore(application.getJobPosting().getPassingScore()) // 합격기준점수 추가
                .build();
    }
}