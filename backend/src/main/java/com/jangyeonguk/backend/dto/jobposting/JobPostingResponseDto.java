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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private LocalDate applicationStartDate; // 모집시작일
    private LocalDate applicationEndDate; // 모집마감일
    private LocalDate evaluationEndDate; // 평가 마감일
    private String description; // 설명
    private String experienceRequirements; // 경력 요구사항
    private String educationRequirements; // 학력 요구사항
    private String requiredSkills; // 요구기술, 스킬
    private Integer totalScore; // 총점
    private Integer resumeScoreWeight; // 이력서 배점 비중
    private Integer coverLetterScoreWeight; // 자기소개서 배점 비중
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
                .applicationStartDate(jobPosting.getApplicationStartDate() != null ? jobPosting.getApplicationStartDate().toLocalDate() : null)
                .applicationEndDate(jobPosting.getApplicationEndDate() != null ? jobPosting.getApplicationEndDate().toLocalDate() : null)
                .evaluationEndDate(jobPosting.getEvaluationEndDate() != null ? jobPosting.getEvaluationEndDate().toLocalDate() : null)
                .description(jobPosting.getDescription())
                .experienceRequirements(jobPosting.getExperienceRequirements())
                .educationRequirements(jobPosting.getEducationRequirements())
                .requiredSkills(jobPosting.getRequiredSkills())
                .totalScore(jobPosting.getTotalScore())
                .resumeScoreWeight(jobPosting.getResumeScoreWeight())
                .coverLetterScoreWeight(jobPosting.getCoverLetterScoreWeight())
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

    /**
     * FAST API로 보낼 평가 데이터를 Map 형태로 변환
     */
    public Map<String, Object> toFastApiEvaluationData() {
        Map<String, Object> evaluationData = new HashMap<>();

        evaluationData.put("job_posting_id", this.id);
        evaluationData.put("title", this.title);
        evaluationData.put("company_name", this.companyName);
        evaluationData.put("job_role", this.jobRole);
        evaluationData.put("total_score", this.totalScore);
        evaluationData.put("resume_score_weight", this.resumeScoreWeight);
        evaluationData.put("cover_letter_score_weight", this.coverLetterScoreWeight);
        evaluationData.put("passing_score", this.passingScore);
        evaluationData.put("ai_automatic_evaluation", this.aiAutomaticEvaluation);
        evaluationData.put("manual_review", this.manualReview);
        evaluationData.put("timestamp", System.currentTimeMillis());

        // 이력서 항목 데이터
        if (this.resumeItems != null) {
            evaluationData.put("resume_items", this.resumeItems.stream()
                    .map(item -> {
                        Map<String, Object> itemData = new HashMap<>();
                        itemData.put("id", item.getId());
                        itemData.put("name", item.getName());
                        itemData.put("type", item.getType());
                        itemData.put("is_required", item.getIsRequired());

                        // 평가 기준 데이터
                        if (item.getCriteria() != null) {
                            itemData.put("criteria", item.getCriteria().stream()
                                    .map(criterion -> {
                                        Map<String, Object> criterionData = new HashMap<>();
                                        criterionData.put("grade", criterion.getGrade());
                                        criterionData.put("description", criterion.getDescription());
                                        criterionData.put("score_per_grade", criterion.getScorePerGrade());
                                        return criterionData;
                                    })
                                    .collect(Collectors.toList()));
                        }

                        return itemData;
                    })
                    .collect(Collectors.toList()));
        }

        // 자기소개서 질문 데이터
        if (this.coverLetterQuestions != null) {
            evaluationData.put("cover_letter_questions", this.coverLetterQuestions.stream()
                    .map(question -> {
                        Map<String, Object> questionData = new HashMap<>();
                        questionData.put("id", question.getId());
                        questionData.put("content", question.getContent());
                        questionData.put("is_required", question.getIsRequired());
                        questionData.put("max_characters", question.getMaxCharacters());

                        // 평가 기준 데이터
                        if (question.getCriteria() != null) {
                            questionData.put("criteria", question.getCriteria().stream()
                                    .map(criterion -> {
                                        Map<String, Object> criterionData = new HashMap<>();
                                        criterionData.put("name", criterion.getName());
                                        criterionData.put("overall_description", criterion.getOverallDescription());

                                        // 상세 기준 데이터
                                        if (criterion.getDetails() != null) {
                                            criterionData.put("details", criterion.getDetails().stream()
                                                    .map(detail -> {
                                                        Map<String, Object> detailData = new HashMap<>();
                                                        detailData.put("grade", detail.getGrade());
                                                        detailData.put("description", detail.getDescription());
                                                        detailData.put("score_per_grade", detail.getScorePerGrade());
                                                        return detailData;
                                                    })
                                                    .collect(Collectors.toList()));
                                        }

                                        return criterionData;
                                    })
                                    .collect(Collectors.toList()));
                        }

                        return questionData;
                    })
                    .collect(Collectors.toList()));
        }

        return evaluationData;
    }
}