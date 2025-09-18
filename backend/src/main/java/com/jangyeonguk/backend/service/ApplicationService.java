package com.jangyeonguk.backend.service;

import com.jangyeonguk.backend.domain.application.*;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionAnswer;
import com.jangyeonguk.backend.domain.evaluation.EvaluationResult;
import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.resume.ResumeItem;
import com.jangyeonguk.backend.domain.resume.ResumeItemAnswer;
import com.jangyeonguk.backend.dto.application.ApplicationCreateRequestDto;
import com.jangyeonguk.backend.dto.application.ApplicationResponseDto;
import com.jangyeonguk.backend.dto.evaluation.EvaluationResultDto;
import com.jangyeonguk.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.annotation.PostConstruct;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 지원서 Service
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicantRepository applicantRepository;
    private final JobPostingRepository jobPostingRepository;
    private final ResumeItemRepository resumeItemRepository;
    private final CoverLetterQuestionRepository coverLetterQuestionRepository;
    private final ResumeItemAnswerRepository resumeItemAnswerRepository;
    private final CoverLetterQuestionAnswerRepository coverLetterQuestionAnswerRepository;
    private final EvaluationResultRepository evaluationResultRepository;

    @Value("${fastapi.base-url:http://localhost:8000}")
    private String fastApiBaseUrl;

    private RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @PostConstruct
    public void initRestTemplate() {
        this.restTemplate = new RestTemplate();
        
        // 기존 MessageConverter 제거
        this.restTemplate.getMessageConverters().clear();
        
        // camelCase 설정된 ObjectMapper로 새로운 MessageConverter 생성
        ObjectMapper camelCaseMapper = new ObjectMapper();
        camelCaseMapper.setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
        
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setObjectMapper(camelCaseMapper);
        
        // 기본 MessageConverter들 추가
        this.restTemplate.getMessageConverters().add(new org.springframework.http.converter.StringHttpMessageConverter());
        this.restTemplate.getMessageConverters().add(converter);
        this.restTemplate.getMessageConverters().add(new org.springframework.http.converter.FormHttpMessageConverter());
    }

    /**
     * 지원서 제출
     */
    @Transactional
    public ApplicationResponseDto submitApplication(Long jobPostingId, ApplicationCreateRequestDto request) {
        // 채용공고 조회
        JobPosting jobPosting = jobPostingRepository.findById(jobPostingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채용공고입니다: " + jobPostingId));

        // 지원자 조회 또는 생성
        Applicant applicant = applicantRepository.findByEmail(request.getApplicantEmail())
                .orElseGet(() -> {
                    Applicant newApplicant = new Applicant();
                    newApplicant.setName(request.getApplicantName());
                    newApplicant.setEmail(request.getApplicantEmail());
                    return applicantRepository.save(newApplicant);
                });

        // 지원서 생성
        Application application = new Application();
        application.setStatus(ApplicationStatus.BEFORE_EVALUATION);
        application.setApplicant(applicant);
        application.setJobPosting(jobPosting);

        Application savedApplication = applicationRepository.save(application);

        // 이력서 항목 답변 저장
        if (request.getResumeItemAnswers() != null) {
            request.getResumeItemAnswers().forEach(answerDto -> {
                ResumeItem resumeItem = resumeItemRepository.findById(answerDto.getResumeItemId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이력서 항목입니다: " + answerDto.getResumeItemId()));

                ResumeItemAnswer answer = new ResumeItemAnswer();
                answer.setResumeContent(answerDto.getResumeContent());
                answer.setApplication(savedApplication);
                answer.setResumeItem(resumeItem);
                resumeItemAnswerRepository.save(answer);
            });
        }

        // 자기소개서 질문 답변 저장
        if (request.getCoverLetterQuestionAnswers() != null) {
            request.getCoverLetterQuestionAnswers().forEach(answerDto -> {
                CoverLetterQuestion question = coverLetterQuestionRepository.findById(answerDto.getCoverLetterQuestionId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 자기소개서 질문입니다: " + answerDto.getCoverLetterQuestionId()));

                CoverLetterQuestionAnswer answer = new CoverLetterQuestionAnswer();
                answer.setAnswerContent(answerDto.getAnswerContent());
                answer.setApplication(savedApplication);
                answer.setCoverLetterQuestion(question);

                coverLetterQuestionAnswerRepository.save(answer);
            });
        }

        // FastAPI에 지원서 데이터 전송 (비동기)
        try {
            log.info("지원서 데이터를 FastAPI로 전송 시작 - Application ID: {}", savedApplication.getId());

            Map<String, Object> applicationData = createApplicationDataForFastApi(savedApplication, request);
            processApplicationAsync(savedApplication.getId(), applicationData);

        } catch (Exception e) {
            log.error("FastAPI 연동 실패 - Application ID: {}", savedApplication.getId(), e);
            // FastAPI 연동 실패는 로그만 남기고 사용자에게는 성공으로 처리
        }

        return ApplicationResponseDto.from(savedApplication);
    }

    /**
     * FastAPI로 보낼 지원서 데이터 생성
     */
    private Map<String, Object> createApplicationDataForFastApi(Application application, ApplicationCreateRequestDto request) {
        Map<String, Object> data = new HashMap<>();

        // 지원자 정보
        data.put("applicantId", application.getApplicant().getId());
        data.put("applicantName", application.getApplicant().getName());
        data.put("applicantEmail", application.getApplicant().getEmail());

        // 지원서 정보
        data.put("applicationId", application.getId());
        data.put("jobPostingId", application.getJobPosting().getId());
        data.put("jobPostingTitle", application.getJobPosting().getTitle());
        data.put("companyName", application.getJobPosting().getCompany().getName());
        data.put("submissionTime", System.currentTimeMillis());

        // 이력서 답변 정보
        if (request.getResumeItemAnswers() != null) {
            data.put("resumeItemAnswers", request.getResumeItemAnswers().stream()
                    .map(answer -> {
                        Map<String, Object> answerData = new HashMap<>();
                        answerData.put("resumeItemId", answer.getResumeItemId());
                        answerData.put("resumeItemName", answer.getResumeItemName());
                        answerData.put("resumeContent", answer.getResumeContent());
                        
                        // ResumeItem에서 maxScore 조회
                        ResumeItem resumeItem = resumeItemRepository.findById(answer.getResumeItemId()).orElse(null);
                        if (resumeItem != null) {
                            answerData.put("maxScore", resumeItem.getMaxScore());
                        }
                        
                        return answerData;
                    })
                    .collect(Collectors.toList()));
        }

        // 자기소개서 답변 정보
        if (request.getCoverLetterQuestionAnswers() != null) {
            data.put("coverLetterQuestionAnswers", request.getCoverLetterQuestionAnswers().stream()
                    .map(answer -> {
                        Map<String, Object> answerData = new HashMap<>();
                        answerData.put("coverLetterQuestionId", answer.getCoverLetterQuestionId());
                        answerData.put("questionContent", answer.getQuestionContent());
                        answerData.put("answerContent", answer.getAnswerContent());
                        return answerData;
                    })
                    .collect(Collectors.toList()));
        }

        return data;
    }

    /**
     * 지원서 처리 (비동기)
     */
    @Async
    public CompletableFuture<Void> processApplicationAsync(Long applicationId, Map<String, Object> applicationData) {
        return CompletableFuture.runAsync(() -> {
            try {
                log.info("지원서 처리 시작 - Application ID: {}", applicationId);

                // FastAPI에 데이터 전송
                String fastApiResponse = sendApplicationDataToFastApi(applicationData);

                log.info("지원서 처리 완료 - Application ID: {}, Response: {}", applicationId, fastApiResponse);

                // 기업에게 알림 전송 (현재 비활성화)
                // sendNotificationToCompany(applicationId, applicationData);

            } catch (Exception e) {
                log.error("지원서 처리 실패 - Application ID: {}", applicationId, e);
            }
        });
    }

    /**
     * FastAPI에 지원서 데이터 전송
     */
    private String sendApplicationDataToFastApi(Map<String, Object> applicationData) {
        try {
            String url = fastApiBaseUrl + "/api/applications/submit";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 전송할 데이터 로깅
            log.info("FastAPI로 전송할 데이터: {}", objectMapper.writeValueAsString(applicationData));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(applicationData, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("FastAPI 응답 오류: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("FastAPI 통신 실패", e);
            throw new RuntimeException("FastAPI 통신 실패: " + e.getMessage());
        }
    }

    /**
     * 평가 결과 처리
     */
    @Transactional
    public void processEvaluationResult(EvaluationResultDto evaluationResult) {
        try {
            log.info("평가 결과 처리 시작 - 지원자: {}, 공고 ID: {}",
                    evaluationResult.getApplicantName(), evaluationResult.getJobPostingId());

            // 지원서 조회
            Applicant applicant = applicantRepository.findAllByEmail(evaluationResult.getApplicantEmail()).stream().findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("지원자를 찾을 수 없습니다."));

            List<Application> applications = applicationRepository.findByApplicant(applicant);
            Application application = applications.get(applications.size() - 1);

            // 지원서 상태 업데이트
            application.setStatus(ApplicationStatus.IN_PROGRESS);
            applicationRepository.save(application);

            // 평가 결과 저장
            EvaluationResult evaluationResultEntity = EvaluationResult.builder()
                    .application(application)
                    .applicantName(evaluationResult.getApplicantName())
                    .applicantEmail(evaluationResult.getApplicantEmail())
                    .jobPostingId(evaluationResult.getJobPostingId())
                    .totalScore(calculateTotalScore(evaluationResult))
                    .resumeScores(objectMapper.writeValueAsString(evaluationResult.getResumeEvaluations()))
                    .coverLetterScores(objectMapper.writeValueAsString(evaluationResult.getCoverLetterQuestionEvaluations()))
                    .overallEvaluation(objectMapper.writeValueAsString(evaluationResult.getOverallAnalysis()))
                    .evaluationCompletedAt(LocalDateTime.now())
                    .build();

            evaluationResultRepository.save(evaluationResultEntity);

            log.info("평가 결과 처리 완료 - 지원자: {}, 총점: {}",
                    evaluationResult.getApplicantName(), calculateTotalScore(evaluationResult));

        } catch (Exception e) {
            log.error("평가 결과 처리 실패 - 지원자: {}, 공고 ID: {}",
                    evaluationResult.getApplicantName(), evaluationResult.getJobPostingId(), e);
            throw new RuntimeException("평가 결과 처리에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 총점 계산 (이력서 항목별 최대점수의 합계)
     */
    private Integer calculateTotalScore(EvaluationResultDto evaluationResult) {
        int totalMaxScore = 0;
        
        // 이력서 항목별 최대점수 합계
        if (evaluationResult.getResumeEvaluations() != null) {
            totalMaxScore += evaluationResult.getResumeEvaluations().stream()
                    .mapToInt(EvaluationResultDto.ResumeEvaluationDto::getMaxScore)
                    .sum();
        }
        
        return totalMaxScore;
    }


    /**
     * 모든 지원서 조회
     */
    public List<ApplicationResponseDto> getApplications() {
        List<Application> applications = applicationRepository.findAll();
        return applications.stream()
                .map(ApplicationResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 공고별 지원서 조회
     */
    public List<ApplicationResponseDto> getApplicationsByJobPosting(Long jobPostingId) {
        List<Application> applications = applicationRepository.findByJobPostingId(jobPostingId);
        return applications.stream()
                .map(ApplicationResponseDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 지원서 ID로 지원자 정보와 답변 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getApplicationDetails(Long applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("지원서를 찾을 수 없습니다."));

        // 지원자 정보
        Applicant applicant = application.getApplicant();

        // 이력서 답변 조회
        List<ResumeItemAnswer> resumeAnswers = resumeItemAnswerRepository.findByApplicationId(applicationId);

        // 자기소개서 답변 조회
        List<CoverLetterQuestionAnswer> coverLetterAnswers = coverLetterQuestionAnswerRepository.findByApplicationId(applicationId);

        // 평가 결과 조회 (이미 저장된 것)
        Optional<EvaluationResult> evaluationResult = evaluationResultRepository.findByApplicationId(applicationId);

        Map<String, Object> response = new HashMap<>();
        response.put("application", ApplicationResponseDto.from(application));
        response.put("applicant", Map.of(
                "id", applicant.getId(),
                "name", applicant.getName(),
                "email", applicant.getEmail()
        ));
        response.put("resumeAnswers", resumeAnswers.stream().map(answer -> Map.of(
                "resumeItemId", answer.getResumeItem().getId(),
                "resumeItemName", answer.getResumeItem().getName(),
                "answer", answer.getResumeContent()
        )).collect(Collectors.toList()));
        response.put("coverLetterAnswers", coverLetterAnswers.stream().map(answer -> Map.of(
                "questionId", answer.getCoverLetterQuestion().getId(),
                "questionContent", answer.getCoverLetterQuestion().getContent(),
                "answer", answer.getAnswerContent()
        )).collect(Collectors.toList()));

        // 평가 결과가 있으면 포함
        if (evaluationResult.isPresent()) {
            try {
                EvaluationResult evalResult = evaluationResult.get();
                Map<String, Object> evaluationData = new HashMap<>();
                evaluationData.put("total_score", evalResult.getTotalScore());
                evaluationData.put("resume_scores", objectMapper.readValue(evalResult.getResumeScores(), List.class));
                evaluationData.put("cover_letter_scores", objectMapper.readValue(evalResult.getCoverLetterScores(), List.class));
                evaluationData.put("overall_evaluation", objectMapper.readValue(evalResult.getOverallEvaluation(), Map.class));

                response.put("evaluationResult", evaluationData);
            } catch (Exception e) {
                log.error("평가 결과 파싱 실패: {}", e.getMessage());
                response.put("evaluationError", "평가 결과를 파싱할 수 없습니다.");
            }
        } else {
            response.put("evaluationResult", null);
        }

        return response;
    }

    /**
     * 지원서 평가 의견 및 상태 저장
     */
    @Transactional
    public void saveEvaluation(Long applicationId, String comment, String status) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("지원서를 찾을 수 없습니다."));

        // 평가 의견 저장
        application.setEvaluationComment(comment);

        // 평가 상태 저장
        try {
            ApplicationStatus applicationStatus = ApplicationStatus.valueOf(status);
            application.setStatus(applicationStatus);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("유효하지 않은 평가 상태입니다: " + status);
        }

        applicationRepository.save(application);

        log.info("지원서 평가 저장 완료 - Application ID: {}, Status: {}", applicationId, status);
    }

}