package com.jangyeonguk.backend.service;

import com.jangyeonguk.backend.domain.jobposting.Company;
import com.jangyeonguk.backend.dto.company.CompanyCreateRequestDto;
import com.jangyeonguk.backend.dto.company.CompanyResponseDto;
import com.jangyeonguk.backend.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회사 Service
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;

    /**
     * 회사 등록
     */
    @Transactional
    public CompanyResponseDto registerCompany(CompanyCreateRequestDto request) {
        // 이미 등록된 회사가 있는지 확인
        if (companyRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("이미 등록된 회사입니다: " + request.getName());
        }

        Company company = new Company();
        company.setName(request.getName());

        Company savedCompany = companyRepository.save(company);
        return convertToResponseDto(savedCompany);
    }

    /**
     * 회사 조회
     */
    public CompanyResponseDto getCompany() {
        Company company = companyRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("등록된 회사가 없습니다."));

        return convertToResponseDto(company);
    }

    /**
     * Company 엔티티를 CompanyResponseDto로 변환
     */
    private CompanyResponseDto convertToResponseDto(Company company) {
        return new CompanyResponseDto(company.getId(), company.getName());
    }
}