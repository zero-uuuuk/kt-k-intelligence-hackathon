package com.jangyeonguk.backend.dto.evaluation;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 평가 결과 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvaluationResultDto {

    @JsonProperty("applicant_name")
    private String applicantName;

    @JsonProperty("applicant_email")
    private String applicantEmail;

    @JsonProperty("job_posting_id")
    private Long jobPostingId;

    @JsonProperty("total_score")
    private Integer totalScore;

    @JsonProperty("resume_scores")
    private List<ResumeScoreDto> resumeScores;

    @JsonProperty("cover_letter_scores")
    private List<CoverLetterScoreDto> coverLetterScores;

    @JsonProperty("overall_evaluation")
    private OverallEvaluationDto overallEvaluation;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResumeScoreDto {
        private Long id;
        private String name;
        private Integer score;

        @JsonProperty("word_count_score")
        private Integer wordCountScore;

        @JsonProperty("applicant_answer") // 지원자 답변 추가
        private String applicantAnswer;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CoverLetterScoreDto {
        @JsonProperty("question_id")
        private Long questionId;

        @JsonProperty("question_content")
        private String questionContent;

        @JsonProperty("applicant_answer") // 지원자 답변 추가
        private String applicantAnswer;

        private List<String> tags;

        @JsonProperty("checked_contents")
        private List<CheckedContentDto> checkedContents;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckedContentDto {
        private String content;
        private String evaluation;
        private String reason;

        @JsonProperty("criterion_name")
        private String criterionName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverallEvaluationDto {
        @JsonProperty("comprehensive_evaluation")
        private String comprehensiveEvaluation;

        private List<String> strengths;

        @JsonProperty("improvement_points")
        private List<String> improvementPoints;

        @JsonProperty("key_insights")
        private List<String> keyInsights;

        @JsonProperty("pass_decision")
        private String passDecision;

        @JsonProperty("confidence_level")
        private Double confidenceLevel;
    }
}