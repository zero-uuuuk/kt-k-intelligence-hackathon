package com.jangyeonguk.backend.repository;

import com.jangyeonguk.backend.domain.application.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 지원서 Repository
 */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByJobPostingId(Long jobPostingId);
}