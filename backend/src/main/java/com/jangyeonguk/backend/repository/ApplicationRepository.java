package com.jangyeonguk.backend.repository;

import com.jangyeonguk.backend.domain.application.Applicant;
import com.jangyeonguk.backend.domain.application.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 지원서 Repository
 */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByJobPostingId(Long jobPostingId);

    List<Application> findByApplicant(Applicant applicant);

    // 추가된 메서드
    Optional<Application> findByApplicantEmailAndJobPostingId(String applicantEmail, Long jobPostingId);
}