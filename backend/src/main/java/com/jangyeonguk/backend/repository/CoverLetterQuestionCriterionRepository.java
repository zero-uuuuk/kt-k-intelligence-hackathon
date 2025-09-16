package com.jangyeonguk.backend.repository;

import com.jangyeonguk.backend.domain.coverletter.CoverLetterQuestionCriterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 자기소개서 질문 평가기준 Repository
 */
@Repository
public interface CoverLetterQuestionCriterionRepository extends JpaRepository<CoverLetterQuestionCriterion, Long> {

    /**
     * 자기소개서 질문 ID로 평가기준 목록 조회
     */
    List<CoverLetterQuestionCriterion> findByCoverLetterQuestionId(Long coverLetterQuestionId);
}