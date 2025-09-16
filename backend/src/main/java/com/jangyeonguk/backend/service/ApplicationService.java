package com.jangyeonguk.backend.service;

import com.jangyeonguk.backend.domain.application.*;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestion;
import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionAnswer;
import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.resume.ResumeItem;
import com.jangyeonguk.backend.domain.resume.ResumeItemAnswer;
import com.jangyeonguk.backend.dto.application.ApplicationCreateRequestDto;
import com.jangyeonguk.backend.dto.application.ApplicationResponseDto;
import com.jangyeonguk.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 지원서 Service
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicantRepository applicantRepository;
    private final JobPostingRepository jobPostingRepository;
    private final ResumeItemRepository resumeItemRepository;
    private final CoverLetterQuestionRepository coverLetterQuestionRepository;
    private final ResumeItemAnswerRepository resumeItemAnswerRepository;
    private final CoverLetterQuestionAnswerRepository coverLetterQuestionAnswerRepository;

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
                // 답변 저장 추가
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
                // 다른 점수들은 나중에 평가 시 설정

                // 답변 저장 추가
                coverLetterQuestionAnswerRepository.save(answer);
            });
        }

        return ApplicationResponseDto.from(savedApplication);
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
}
