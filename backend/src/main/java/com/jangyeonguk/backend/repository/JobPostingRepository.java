package com.jangyeonguk.backend.repository;

import com.jangyeonguk.backend.domain.jobposting.JobPosting;
import com.jangyeonguk.backend.domain.jobposting.PostingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 채용공고 Repository
 */
@Repository
public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    /**
     * 회사 ID로 채용공고 목록 조회
     */
    List<JobPosting> findByCompanyId(Long companyId);
}