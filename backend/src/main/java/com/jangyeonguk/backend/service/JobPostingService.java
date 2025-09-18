package com.jangyeonguk.backend.service;

import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionCriterion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionCriterionDetail;
import com.jangyeonguk.backend.domain.jobposting.Company;
import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.jobposting.PostingStatus;
import com.jangyeonguk.backend.domain.resume.ResumeItem;
import com.jangyeonguk.backend.domain.resume.ResumeItemCriterion;
import com.jangyeonguk.backend.dto.jobposting.JobPostingCreateRequestDto;
import com.jangyeonguk.backend.dto.jobposting.JobPostingResponseDto;
import com.jangyeonguk.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 채용공고 Service
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class JobPostingService {

    private final JobPostingRepository jobPostingRepository;
    private final ResumeItemRepository resumeItemRepository;
    private final ResumeItemCriterionRepository resumeItemCriterionRepository;
    private final CoverLetterQuestionRepository coverLetterQuestionRepository;
    private final CoverLetterQuestionCriterionRepository coverLetterQuestionCriterionRepository;
    private final CoverLetterQuestionCriterionDetailRepository coverLetterQuestionCriterionDetailRepository;
    private final CompanyRepository companyRepository;

    @Value("${fastapi.base-url:http://localhost:8000}")
    private String fastApiBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

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
                .applicationStartDate(request.getApplicationStartDate() != null ? request.getApplicationStartDate().atStartOfDay() : null)
                .applicationEndDate(request.getApplicationEndDate() != null ? request.getApplicationEndDate().atStartOfDay() : null)
                .evaluationEndDate(request.getEvaluationEndDate() != null ? request.getEvaluationEndDate().atStartOfDay() : null)
                .description(request.getDescription())
                .experienceRequirements(request.getExperienceRequirements())
                .educationRequirements(request.getEducationRequirements())
                .requiredSkills(request.getRequiredSkills())
                .totalScore(request.getTotalScore())
                .resumeScoreWeight(request.getResumeScoreWeight())
                .coverLetterScoreWeight(request.getCoverLetterScoreWeight())
                .passingScore(request.getPassingScore())
                .aiAutomaticEvaluation(request.getAiAutomaticEvaluation())
                .manualReview(request.getManualReview())
                .postingStatus(request.getPostingStatus())
                .company(company)
                .build();

        JobPosting savedJobPosting = jobPostingRepository.save(jobPosting);

        // 날짜에 따라 초기 상태 설정
        PostingStatus initialStatus = determinePostingStatus(savedJobPosting, LocalDateTime.now());
        savedJobPosting.setPostingStatus(initialStatus);
        
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
                        .isRequired(resumeItemDto.getIsRequired())
                        .maxScore(resumeItemDto.getMaxScore())
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

        // JobPostingResponseDto 생성
        JobPostingResponseDto response = JobPostingResponseDto.from(savedJobPosting);

        // FAST API에 평가 기준 학습 요청 (동기)
        try {
            log.info("평가 기준 학습 시작 - JobPosting ID: {}", savedJobPosting.getId());

            Map<String, Object> evaluationData = response.toFastApiEvaluationData();
            String fastApiResponse = sendEvaluationDataToFastApi(evaluationData);

            log.info("평가 기준 학습 완료 - JobPosting ID: {}, Response: {}", savedJobPosting.getId(), fastApiResponse);

        } catch (Exception e) {
            log.error("FAST API 연동 실패 - JobPosting ID: {}", savedJobPosting.getId(), e);
            throw new RuntimeException("평가 기준 학습에 실패했습니다: " + e.getMessage());
        }

        return response;
    }

    /**
     * FAST API에 평가 기준 데이터 전송 (동기)
     */
    private String sendEvaluationDataToFastApi(Map<String, Object> evaluationData) {
        try {
            String url = fastApiBaseUrl + "/api/evaluation-criteria/train";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(evaluationData, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("FAST API 응답 오류: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("FAST API 통신 실패", e);
            throw new RuntimeException("FAST API 통신 실패: " + e.getMessage());
        }
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
        existingJobPosting.setApplicationStartDate(request.getApplicationStartDate() != null ? request.getApplicationStartDate().atStartOfDay() : null);
        existingJobPosting.setApplicationEndDate(request.getApplicationEndDate() != null ? request.getApplicationEndDate().atStartOfDay() : null);
        existingJobPosting.setEvaluationEndDate(request.getEvaluationEndDate() != null ? request.getEvaluationEndDate().atStartOfDay() : null);
        existingJobPosting.setDescription(request.getDescription());
        existingJobPosting.setExperienceRequirements(request.getExperienceRequirements());
        existingJobPosting.setEducationRequirements(request.getEducationRequirements());
        existingJobPosting.setRequiredSkills(request.getRequiredSkills());
        existingJobPosting.setTotalScore(request.getTotalScore());
        existingJobPosting.setResumeScoreWeight(request.getResumeScoreWeight());
        existingJobPosting.setCoverLetterScoreWeight(request.getCoverLetterScoreWeight());
        existingJobPosting.setPassingScore(request.getPassingScore());
        existingJobPosting.setAiAutomaticEvaluation(request.getAiAutomaticEvaluation());
        existingJobPosting.setManualReview(request.getManualReview());
        
        // 날짜에 따라 상태 자동 설정 (수동 설정 무시)
        PostingStatus updatedStatus = determinePostingStatus(existingJobPosting, LocalDateTime.now());
        existingJobPosting.setPostingStatus(updatedStatus);

        // 기존 ResumeItems 삭제
        resumeItemRepository.deleteByJobPostingId(id);

        // 새로운 ResumeItems 저장
        if (request.getResumeItems() != null) {
            request.getResumeItems().forEach(resumeItemDto -> {
                ResumeItem resumeItem = ResumeItem.builder()
                        .name(resumeItemDto.getName())
                        .type(resumeItemDto.getType())
                        .isRequired(resumeItemDto.getIsRequired())
                        .maxScore(resumeItemDto.getMaxScore())
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

    /**
     * 채용공고 상태를 현재 시간 기준으로 업데이트
     */
    @Transactional
    public void updateJobPostingStatuses() {
        log.info("채용공고 상태 업데이트 시작");
        
        LocalDateTime now = LocalDateTime.now();
        List<JobPosting> allJobPostings = jobPostingRepository.findAll();
        
        int updatedCount = 0;
        
        for (JobPosting jobPosting : allJobPostings) {
            PostingStatus currentStatus = jobPosting.getPostingStatus();
            PostingStatus newStatus = determinePostingStatus(jobPosting, now);
            
            if (currentStatus != newStatus) {
                jobPosting.setPostingStatus(newStatus);
                jobPostingRepository.save(jobPosting);
                updatedCount++;
                
                log.info("채용공고 상태 업데이트 - ID: {}, 제목: {}, {} -> {}", 
                    jobPosting.getId(), 
                    jobPosting.getTitle(),
                    currentStatus.getDescription(), 
                    newStatus.getDescription());
            }
        }
        
        log.info("채용공고 상태 업데이트 완료 - 총 {}개 업데이트", updatedCount);
    }

    /**
     * 현재 시간 기준으로 채용공고 상태 결정
     */
    private PostingStatus determinePostingStatus(JobPosting jobPosting, LocalDateTime now) {
        LocalDateTime applicationStartDate = jobPosting.getApplicationStartDate();
        LocalDateTime applicationEndDate = jobPosting.getApplicationEndDate();
        LocalDateTime evaluationEndDate = jobPosting.getEvaluationEndDate();
        
        // null 체크 - 필수 날짜 필드가 null이면 기본값 반환
        if (applicationStartDate == null || applicationEndDate == null) {
            log.warn("채용공고 ID: {} - 필수 날짜 필드가 null입니다. applicationStartDate: {}, applicationEndDate: {}", 
                jobPosting.getId(), applicationStartDate, applicationEndDate);
            return PostingStatus.SCHEDULED; // 기본값으로 모집예정 반환
        }
        
        // evaluationEndDate가 null인 경우 applicationEndDate로 대체
        if (evaluationEndDate == null) {
            log.warn("채용공고 ID: {} - evaluationEndDate가 null입니다. applicationEndDate로 대체합니다.", jobPosting.getId());
            evaluationEndDate = applicationEndDate;
        }
        
        // 모집 시작 전
        if (now.isBefore(applicationStartDate)) {
            return PostingStatus.SCHEDULED;
        }
        // 모집 기간 중
        else if (now.isAfter(applicationStartDate) && now.isBefore(applicationEndDate)) {
            return PostingStatus.IN_PROGRESS;
        }
        // 모집 마감 후 평가 기간 중
        else if (now.isAfter(applicationEndDate) && now.isBefore(evaluationEndDate)) {
            return PostingStatus.CLOSED;
        }
        // 평가 완료
        else {
            return PostingStatus.EVALUATION_COMPLETE;
        }
    }

    /**
     * 매일 00시 00분에 채용공고 상태 업데이트
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void scheduledUpdateJobPostingStatuses() {
        log.info("스케줄된 채용공고 상태 업데이트 실행");
        updateJobPostingStatuses();
    }

}