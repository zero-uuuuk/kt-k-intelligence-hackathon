package com.jangyeonguk.backend.dto.jobposting;

import com.jangyeonguk.backend.domain.jobposting.EmploymentType;
import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.jobposting.PostingStatus;
import com.jangyeonguk.backend.dto.coverletter.CoverLetterQuestionResponseDto;
import com.jangyeonguk.backend.dto.resume.ResumeItemResponseDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 채용공고 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPostingResponseDto {

    private Long id;
    private String title; // 공고 제목
    private String teamDepartment; // 팀/부서
    private String jobRole; // 직무
    private EmploymentType employmentType; // 고용형태
    private LocalDateTime applicationStartDate; // 모집시작일
    private LocalDateTime applicationEndDate; // 모집마감일
    private LocalDateTime evaluationEndDate; // 평가 마감일
    private String description; // 설명
    private String experienceRequirements; // 경력 요구사항
    private String educationRequirements; // 학력 요구사항
    private String requiredSkills; // 요구기술, 스킬
    private Integer totalScore; // 총점
    private Integer passingScore; // 합격기준점수
    private Boolean aiAutomaticEvaluation; // AI 자동평가여부
    private Boolean manualReview; // 수동 검토여부
    private String publicLinkUrl; // 공개 링크 URL
    private PostingStatus postingStatus; // 공고상태
    private Long companyId; // 회사 ID
    private String companyName; // 회사명

    // 중첩된 구조
    private List<ResumeItemResponseDto> resumeItems; // 이력서 항목 목록
    private List<CoverLetterQuestionResponseDto> coverLetterQuestions; // 자기소개서 질문 목록

    /**
     * JobPosting 엔티티를 JobPostingResponseDto로 변환
     */
    public static JobPostingResponseDto from(JobPosting jobPosting) {
        return JobPostingResponseDto.builder()
                .id(jobPosting.getId())
                .title(jobPosting.getTitle())
                .teamDepartment(jobPosting.getTeamDepartment())
                .jobRole(jobPosting.getJobRole())
                .employmentType(jobPosting.getEmploymentType())
                .applicationStartDate(jobPosting.getApplicationStartDate())
                .applicationEndDate(jobPosting.getApplicationEndDate())
                .evaluationEndDate(jobPosting.getEvaluationEndDate())
                .description(jobPosting.getDescription())
                .experienceRequirements(jobPosting.getExperienceRequirements())
                .educationRequirements(jobPosting.getEducationRequirements())
                .requiredSkills(jobPosting.getRequiredSkills())
                .totalScore(jobPosting.getTotalScore())
                .passingScore(jobPosting.getPassingScore())
                .aiAutomaticEvaluation(jobPosting.getAiAutomaticEvaluation())
                .manualReview(jobPosting.getManualReview())
                .postingStatus(jobPosting.getPostingStatus())
                .publicLinkUrl(jobPosting.getPublicLinkUrl()) // 공개 링크 URL 추가
                .companyId(jobPosting.getCompany().getId())
                .companyName(jobPosting.getCompany().getName())
                .resumeItems(jobPosting.getResumeItems() != null ?
                        jobPosting.getResumeItems().stream()
                                .map(ResumeItemResponseDto::from)
                                .collect(Collectors.toList()) : new ArrayList<>())
                .coverLetterQuestions(jobPosting.getCoverLetterQuestions() != null ?
                        jobPosting.getCoverLetterQuestions().stream()
                                .map(CoverLetterQuestionResponseDto::from)
                                .collect(Collectors.toList()) : new ArrayList<>())
                .build();
    }
}