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

    public static ApplicationResponseDto from(Application application) {
        return ApplicationResponseDto.builder()
                .id(application.getId())
                .status(application.getStatus())
                .applicantName(application.getApplicant().getName())
                .applicantEmail(application.getApplicant().getEmail())
                .jobPostingId(application.getJobPosting().getId())
                .jobPostingTitle(application.getJobPosting().getTitle())
                .build();
    }
}