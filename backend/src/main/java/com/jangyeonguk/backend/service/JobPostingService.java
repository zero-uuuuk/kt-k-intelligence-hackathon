package com.jangyeonguk.backend.service;

import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionCriterion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionCriterionDetail;
import com.jangyeonguk.backend.domain.jobposting.Company;
import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.resume.ResumeItem;
import com.jangyeonguk.backend.domain.resume.ResumeItemCriterion;
import com.jangyeonguk.backend.dto.jobposting.JobPostingCreateRequestDto;
import com.jangyeonguk.backend.dto.jobposting.JobPostingResponseDto;
import com.jangyeonguk.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 채용공고 Service
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobPostingService {

    private final JobPostingRepository jobPostingRepository;
    private final ResumeItemRepository resumeItemRepository;
    private final ResumeItemCriterionRepository resumeItemCriterionRepository;
    private final CoverLetterQuestionRepository coverLetterQuestionRepository;
    private final CoverLetterQuestionCriterionRepository coverLetterQuestionCriterionRepository;
    private final CoverLetterQuestionCriterionDetailRepository coverLetterQuestionCriterionDetailRepository;
    private final CompanyRepository companyRepository;

    /**
     * 채용공고 등록
     */
    @Transactional
    public JobPostingResponseDto createJobPosting(JobPostingCreateRequestDto request) {
        // 회사 조회
        Company company = companyRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("등록된 회사가 없습니다."));

        // JobPosting 엔티티 생성 및 저장
        JobPosting jobPosting = JobPosting.builder()
                .title(request.getTitle())
                .teamDepartment(request.getTeamDepartment())
                .jobRole(request.getJobRole())
                .employmentType(request.getEmploymentType())
                .applicationStartDate(request.getApplicationStartDate())
                .applicationEndDate(request.getApplicationEndDate())
                .evaluationEndDate(request.getEvaluationEndDate())
                .description(request.getDescription())
                .experienceRequirements(request.getExperienceRequirements())
                .educationRequirements(request.getEducationRequirements())
                .requiredSkills(request.getRequiredSkills())
                .totalScore(request.getTotalScore())
                .passingScore(request.getPassingScore())
                .aiAutomaticEvaluation(request.getAiAutomaticEvaluation())
                .manualReview(request.getManualReview())
                .postingStatus(request.getPostingStatus())
                .company(company)
                .build();

        JobPosting savedJobPosting = jobPostingRepository.save(jobPosting);

        // 공개 링크 URL 생성 (저장된 ID 사용)
        String publicLinkUrl = generatePublicLinkUrl(savedJobPosting.getId());
        savedJobPosting.setPublicLinkUrl(publicLinkUrl);
        jobPostingRepository.save(savedJobPosting);

        // ResumeItems 저장
        if (request.getResumeItems() != null) {
            request.getResumeItems().forEach(resumeItemDto -> {
                ResumeItem resumeItem = ResumeItem.builder()
                        .name(resumeItemDto.getName())
                        .type(resumeItemDto.getType())
                        .scoreWeight(resumeItemDto.getScoreWeight())
                        .isRequired(resumeItemDto.getIsRequired())
                        .jobPosting(savedJobPosting)
                        .build();

                ResumeItem savedResumeItem = resumeItemRepository.save(resumeItem);

                // ResumeItemCriterions 저장
                if (resumeItemDto.getCriteria() != null) {
                    resumeItemDto.getCriteria().forEach(criterionDto -> {
                        ResumeItemCriterion criterion = ResumeItemCriterion.builder()
                                .grade(criterionDto.getGrade())
                                .description(criterionDto.getDescription())
                                .scorePerGrade(criterionDto.getScorePerGrade())
                                .resumeItem(savedResumeItem)
                                .build();

                        resumeItemCriterionRepository.save(criterion);
                    });
                }
            });
        }

        // CoverLetterQuestions 저장
        if (request.getCoverLetterQuestions() != null) {
            request.getCoverLetterQuestions().forEach(questionDto -> {
                CoverLetterQuestion question = CoverLetterQuestion.builder()
                        .content(questionDto.getContent())
                        .isRequired(questionDto.getIsRequired())
                        .maxCharacters(questionDto.getMaxCharacters())
                        .weight(questionDto.getWeight())
                        .jobPosting(savedJobPosting)
                        .build();

                CoverLetterQuestion savedQuestion = coverLetterQuestionRepository.save(question);

                // CoverLetterQuestionCriterions 저장 부분 수정
                if (questionDto.getCriteria() != null && !questionDto.getCriteria().isEmpty()) {
                    questionDto.getCriteria().forEach(criterionDto -> {
                        // name과 overallDescription이 null이 아닌 경우에만 저장
                        if (criterionDto.getName() != null && !criterionDto.getName().trim().isEmpty()) {
                            CoverLetterQuestionCriterion criterion = CoverLetterQuestionCriterion.builder()
                                    .name(criterionDto.getName())
                                    .overallDescription(criterionDto.getOverallDescription())
                                    .coverLetterQuestion(savedQuestion)
                                    .build();

                            CoverLetterQuestionCriterion savedCriterion = coverLetterQuestionCriterionRepository.save(criterion);

                            // CoverLetterQuestionCriterionDetails 저장
                            if (criterionDto.getDetails() != null && !criterionDto.getDetails().isEmpty()) {
                                criterionDto.getDetails().forEach(detailDto -> {
                                    CoverLetterQuestionCriterionDetail detail = CoverLetterQuestionCriterionDetail.builder()
                                            .grade(detailDto.getGrade())
                                            .description(detailDto.getDescription())
                                            .scorePerGrade(detailDto.getScorePerGrade())
                                            .coverLetterQuestionCriterion(savedCriterion)
                                            .build();

                                    coverLetterQuestionCriterionDetailRepository.save(detail);
                                });
                            }
                        }
                    });
                }
            });
        }

        return JobPostingResponseDto.from(savedJobPosting);
    }

    /**
     * 채용공고 조회
     */
    public JobPostingResponseDto getJobPosting(Long id) {
        JobPosting jobPosting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채용공고입니다: " + id));

        return JobPostingResponseDto.from(jobPosting);
    }

    /**
     * 채용공고 목록 조회
     */
    public List<JobPostingResponseDto> getJobPostings() {
        List<JobPosting> jobPostings = jobPostingRepository.findAll();
        return jobPostings.stream()
                .map(JobPostingResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 채용공고 수정
     */
    @Transactional
    public JobPostingResponseDto updateJobPosting(Long id, JobPostingCreateRequestDto request) {
        // 기존 공고 조회
        JobPosting existingJobPosting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채용공고입니다: " + id));

        // 기존 데이터를 새로운 데이터로 업데이트
        existingJobPosting.setTitle(request.getTitle());
        existingJobPosting.setTeamDepartment(request.getTeamDepartment());
        existingJobPosting.setJobRole(request.getJobRole());
        existingJobPosting.setEmploymentType(request.getEmploymentType());
        existingJobPosting.setApplicationStartDate(request.getApplicationStartDate());
        existingJobPosting.setApplicationEndDate(request.getApplicationEndDate());
        existingJobPosting.setEvaluationEndDate(request.getEvaluationEndDate());
        existingJobPosting.setDescription(request.getDescription());
        existingJobPosting.setExperienceRequirements(request.getExperienceRequirements());
        existingJobPosting.setEducationRequirements(request.getEducationRequirements());
        existingJobPosting.setRequiredSkills(request.getRequiredSkills());
        existingJobPosting.setTotalScore(request.getTotalScore());
        existingJobPosting.setPassingScore(request.getPassingScore());
        existingJobPosting.setAiAutomaticEvaluation(request.getAiAutomaticEvaluation());
        existingJobPosting.setManualReview(request.getManualReview());
        existingJobPosting.setPostingStatus(request.getPostingStatus());

        // 기존 ResumeItems 삭제
        resumeItemRepository.deleteByJobPostingId(id);

        // 새로운 ResumeItems 저장
        if (request.getResumeItems() != null) {
            request.getResumeItems().forEach(resumeItemDto -> {
                ResumeItem resumeItem = ResumeItem.builder()
                        .name(resumeItemDto.getName())
                        .type(resumeItemDto.getType())
                        .scoreWeight(resumeItemDto.getScoreWeight())
                        .isRequired(resumeItemDto.getIsRequired())
                        .jobPosting(existingJobPosting)
                        .build();

                ResumeItem savedResumeItem = resumeItemRepository.save(resumeItem);

                // ResumeItemCriterions 저장
                if (resumeItemDto.getCriteria() != null) {
                    resumeItemDto.getCriteria().forEach(criterionDto -> {
                        ResumeItemCriterion criterion = ResumeItemCriterion.builder()
                                .grade(criterionDto.getGrade())
                                .description(criterionDto.getDescription())
                                .scorePerGrade(criterionDto.getScorePerGrade())
                                .resumeItem(savedResumeItem)
                                .build();

                        resumeItemCriterionRepository.save(criterion);
                    });
                }
            });
        }

        // 기존 CoverLetterQuestions 삭제
        coverLetterQuestionRepository.deleteByJobPostingId(id);

        // 새로운 CoverLetterQuestions 저장
        if (request.getCoverLetterQuestions() != null) {
            request.getCoverLetterQuestions().forEach(questionDto -> {
                CoverLetterQuestion question = CoverLetterQuestion.builder()
                        .content(questionDto.getContent())
                        .isRequired(questionDto.getIsRequired())
                        .maxCharacters(questionDto.getMaxCharacters())
                        .weight(questionDto.getWeight())
                        .jobPosting(existingJobPosting)
                        .build();

                CoverLetterQuestion savedQuestion = coverLetterQuestionRepository.save(question);

                // CoverLetterQuestionCriterions 저장
                if (questionDto.getCriteria() != null && !questionDto.getCriteria().isEmpty()) {
                    questionDto.getCriteria().forEach(criterionDto -> {
                        if (criterionDto.getName() != null && !criterionDto.getName().trim().isEmpty()) {
                            CoverLetterQuestionCriterion criterion = CoverLetterQuestionCriterion.builder()
                                    .name(criterionDto.getName())
                                    .overallDescription(criterionDto.getOverallDescription())
                                    .coverLetterQuestion(savedQuestion)
                                    .build();

                            CoverLetterQuestionCriterion savedCriterion = coverLetterQuestionCriterionRepository.save(criterion);

                            // CoverLetterQuestionCriterionDetails 저장
                            if (criterionDto.getDetails() != null && !criterionDto.getDetails().isEmpty()) {
                                criterionDto.getDetails().forEach(detailDto -> {
                                    CoverLetterQuestionCriterionDetail detail = CoverLetterQuestionCriterionDetail.builder()
                                            .grade(detailDto.getGrade())
                                            .description(detailDto.getDescription())
                                            .scorePerGrade(detailDto.getScorePerGrade())
                                            .coverLetterQuestionCriterion(savedCriterion)
                                            .build();

                                    coverLetterQuestionCriterionDetailRepository.save(detail);
                                });
                            }
                        }
                    });
                }
            });
        }

        JobPosting updatedJobPosting = jobPostingRepository.save(existingJobPosting);
        return JobPostingResponseDto.from(updatedJobPosting);
    }

    /**
     * 공개 링크 URL 생성
     */
    private String generatePublicLinkUrl(Long jobPostingId) {
        return "http://localhost:3000/apply/" + jobPostingId;
    }
}