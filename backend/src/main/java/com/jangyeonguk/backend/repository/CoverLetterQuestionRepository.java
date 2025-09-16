package com.jangyeonguk.backend.repository;

import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 자기소개서 질문 Repository
 */
@Repository
public interface CoverLetterQuestionRepository extends JpaRepository<CoverLetterQuestion, Long> {

    /**
     * 채용공고 ID로 자기소개서 질문 목록 조회
     */
    List<CoverLetterQuestion> findByJobPostingId(Long jobPostingId);

    /**
     * 공고별 자기소개서 질문 삭제
     */
    @Modifying
    @Query("DELETE FROM CoverLetterQuestion c WHERE c.jobPosting.id = :jobPostingId")
    void deleteByJobPostingId(@Param("jobPostingId") Long jobPostingId);
}